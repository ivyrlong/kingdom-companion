/**
 * Vocabulary catalog ingestion — the single upsert path shared by pack
 * creation (POST /api/admin/content-packs) and the one-shot backfill
 * script. Given a set of raw vocabulary words + phrases from a pack,
 * upsert them into VocabularyTerm and link them to the pack.
 *
 * Terms are canonicalised on the way in:
 *   • trim + collapse whitespace
 *   • lowercase for uniqueness (`term`)
 *   • preserve original casing for display (`display`)
 *   • classify as WORD (no whitespace) or PHRASE (has whitespace)
 *
 * Idempotent: re-running against the same pack merges the same terms
 * without creating duplicates. The `firstSeenPackId` is only written on
 * initial insert so it stays stable if the term is re-linked later.
 *
 * Categorisation is NOT done here — new terms land uncategorised and
 * become part of the admin's "inbox" to sort in Phase 2. That keeps
 * ingestion fast and avoids blocking pack creation on AI calls.
 */

import type { PrismaClient } from "@prisma/client";

export interface IngestedCounts {
  /** Terms newly created in the catalog by this call. */
  created: number;
  /** Terms that already existed and were re-linked to this pack. */
  linked: number;
  /** Total unique terms processed (created + linked). */
  processed: number;
}

interface CanonicalTerm {
  term: string; // canonical, lowercased
  display: string; // original casing
  type: "WORD" | "PHRASE";
}

/**
 * Normalise a raw input string into a canonical + display pair.
 * Returns null for obvious rejects (empty, too short, punctuation-only,
 * truncated scripture previews, over-long fragments).
 */
function canonicalise(raw: unknown): CanonicalTerm | null {
  if (typeof raw !== "string") return null;
  // Rejoin words split by a line-wrap hyphen. WOL delivers some text
  // with the print layout preserved — a soft hyphen at end of line
  // becomes `word- word` in the extracted string ("un- der" → "under").
  // Real compounds like "self-control" have no space around the hyphen,
  // so the `-\s+` pattern uniquely targets the broken form.
  const rejoined = raw.replace(/([A-Za-z])-\s+([A-Za-z])/g, "$1$2");
  const display = rejoined.replace(/\s+/g, " ").trim();
  if (!display) return null;
  // Reject anything that's just punctuation/digits.
  if (!/[A-Za-z]/.test(display)) return null;
  // Very short words are noise unless they're multi-word phrases.
  if (!display.includes(" ") && display.length < 3) return null;
  // Reject truncated fragments — WOL scripture popups return verse
  // previews clipped at ~80 chars mid-word with a trailing ellipsis.
  // Any phrase ending in "..." or "…" is a fragment, not a real term.
  if (/(?:\.\.\.|…)\s*$/.test(display)) return null;
  // Reject phrases ending in a colon — always sentence lead-ins to a
  // quote that got dropped ("She adds:", "Jehovah said:"). Not useful.
  if (/:\s*$/.test(display)) return null;
  // Reject anything over 60 chars — real vocabulary / listening
  // phrases are short; anything longer is verse text that leaked in.
  if (display.length > 60) return null;
  const canon = display.toLowerCase();
  return {
    term: canon,
    display,
    type: display.includes(" ") ? "PHRASE" : "WORD",
  };
}

/**
 * Ingest a pack's raw vocabulary + phrases into the catalog and link
 * them to the pack. Returns per-call counts.
 *
 * `prisma` is injected so the same helper works inside a transaction
 * (POST route) or as a standalone script (backfill).
 */
export async function ingestPackVocabulary(
  prisma: PrismaClient,
  packId: string,
  {
    vocabulary,
    keyPhrases,
  }: {
    vocabulary: unknown[];
    keyPhrases: unknown[];
  },
): Promise<IngestedCounts> {
  // Merge + dedupe on the canonical form.
  const byTerm = new Map<string, CanonicalTerm>();
  for (const raw of [...vocabulary, ...keyPhrases]) {
    const c = canonicalise(raw);
    if (!c) continue;
    // Keep the first display we see — preserves proper-name capitalisation.
    if (!byTerm.has(c.term)) byTerm.set(c.term, c);
  }
  const terms = [...byTerm.values()];
  if (terms.length === 0) return { created: 0, linked: 0, processed: 0 };

  let created = 0;
  let linked = 0;

  // Prisma createMany + skipDuplicates would be faster but wouldn't let
  // us detect which rows were new vs existing. Loop-with-upsert keeps
  // the counts honest and stays under a second for typical packs (~15
  // terms). For the 394-pack backfill it's still well under a minute.
  for (const t of terms) {
    const existing = await prisma.vocabularyTerm.findUnique({
      where: { term: t.term },
      select: { id: true },
    });
    let termId: string;
    if (existing) {
      termId = existing.id;
      linked++;
    } else {
      const row = await prisma.vocabularyTerm.create({
        data: {
          term: t.term,
          display: t.display,
          type: t.type,
          firstSeenPackId: packId,
        },
        select: { id: true },
      });
      termId = row.id;
      created++;
    }
    // Link to pack (idempotent — compound PK on (packId, termId)).
    await prisma.packVocabularyLink.upsert({
      where: { packId_termId: { packId, termId } },
      create: { packId, termId },
      update: {},
    });
  }

  return { created, linked, processed: terms.length };
}
