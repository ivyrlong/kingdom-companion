/**
 * Bible verse catalog — lookup + ingest helpers.
 *
 * House rule (see src/lib/scripture.ts):
 *   Bible text is NOT restricted material. Store the NWT verbatim and
 *   use it to fill scripture.text wherever a verse is cited.
 *
 * One-way flow:
 *
 *   scripts/ingest-nwt-bible.ts
 *      ↓ (one-time scrape of WOL NWT chapter pages)
 *   BibleVerse table (bookNumber, chapter, verse, text)
 *      ↓ fillScriptureTexts()
 *   ContentPack.scriptures[i].text  ← every import pipeline writes through this
 *      ↓
 *   Games (ScriptureMemoryMatch, future NameThatScripture) read pack snapshot.
 *
 * The chapter parser is tolerant of multi-segment verses (WOL splits
 * some poetry lines into v{B}-{C}-{V}-{seg}) and strips every <a> inside
 * a verse span — WOL's cross-reference, footnote, and name-popup links
 * all surface as anchors around what we don't want to store.
 */

import * as cheerio from "cheerio";
import type { PrismaClient } from "@prisma/client";
import { parseScriptureRef, type ParsedScriptureRef } from "./scripture";

/**
 * NWT (English) chapter count by book number (1..66). Index 0 unused.
 * Matches the WOL study edition at /wol/b/r1/lp-e/nwtsty/{book}/{chapter}.
 */
export const NWT_CHAPTER_COUNTS: readonly number[] = [
  0,
  50, 40, 27, 36, 34, 24, 21, 4, 31, 24, //  1 Gen – 10 2 Sam
  22, 25, 29, 36, 10, 13, 10, 42, 150, 31, // 11 1 Ki – 20 Prov
  12, 8, 66, 52, 5, 48, 12, 14, 3, 9, // 21 Eccl – 30 Amos
  1, 4, 7, 3, 3, 3, 2, 14, 4, 28, // 31 Oba – 40 Matt
  16, 24, 21, 28, 16, 16, 13, 6, 6, 4, // 41 Mark – 50 Phil
  4, 5, 3, 6, 4, 3, 1, 13, 5, 5, // 51 Col – 60 1 Pet
  3, 5, 1, 1, 1, 22, // 61 2 Pet – 66 Rev
];

/* ------------------------------------------------------------------ */
/*  Chapter parsing                                                    */
/* ------------------------------------------------------------------ */

/**
 * Parse a WOL NWT chapter page into verse rows (one entry per verse,
 * with any multi-segment verses already stitched together).
 */
export function parseNwtChapterHtml(
  html: string,
  bookNumber: number,
  chapter: number,
): Array<{ verse: number; text: string }> {
  const $ = cheerio.load(html);

  interface Segment {
    verse: number;
    segment: number;
    text: string;
  }
  const segments: Segment[] = [];

  // Every verse (and every segment of a split verse) is a <span class="v">
  // whose id is v{book}-{chapter}-{verse}-{segment}. We filter by the
  // exact book+chapter prefix so sidebar previews from a different chapter
  // can't bleed in.
  const idRe = new RegExp(`^v${bookNumber}-${chapter}-(\\d+)-(\\d+)$`);

  $("span.v").each((_, el) => {
    const id = $(el).attr("id") ?? "";
    const m = idRe.exec(id);
    if (!m) return;
    const verse = parseInt(m[1], 10);
    const segment = parseInt(m[2], 10);

    const $node = $(el).clone();

    // Strip every anchor inside — WOL's verse-number link, cross-reference
    // markers (<a class="b">+</a>), footnote markers (<a class="fn">*</a>),
    // and name-popup links all surface as <a>s and never contain words
    // we want to keep.
    $node.find("a").remove();

    // Study-edition superscripts are decorative, drop them.
    $node.find("sup").remove();

    const raw = $node.text();
    const text = raw.replace(/\s+/g, " ").trim();
    if (text) segments.push({ verse, segment, text });
  });

  // Stitch segments of the same verse in segment order.
  const byVerse = new Map<number, Segment[]>();
  for (const s of segments) {
    const list = byVerse.get(s.verse) ?? [];
    list.push(s);
    byVerse.set(s.verse, list);
  }
  const out: Array<{ verse: number; text: string }> = [];
  for (const [verse, list] of byVerse) {
    list.sort((a, b) => a.segment - b.segment);
    const joined = list.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim();
    if (joined) out.push({ verse, text: joined });
  }
  out.sort((a, b) => a.verse - b.verse);
  return out;
}

/**
 * Fetch one chapter from WOL and return its parsed verse rows. The
 * caller is responsible for rate limiting.
 */
export async function fetchNwtChapter(
  bookNumber: number,
  chapter: number,
): Promise<Array<{ verse: number; text: string }>> {
  const url = `https://wol.jw.org/en/wol/b/r1/lp-e/nwtsty/${bookNumber}/${chapter}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "KingdomCompanion/1.0 (scripture ingest; local-only)",
      "Accept": "text/html",
    },
  });
  if (!res.ok) {
    throw new Error(`WOL ${bookNumber}/${chapter} HTTP ${res.status}`);
  }
  const html = await res.text();
  return parseNwtChapterHtml(html, bookNumber, chapter);
}

/* ------------------------------------------------------------------ */
/*  Lookup                                                             */
/* ------------------------------------------------------------------ */

/**
 * Resolve a parsed scripture reference into its verse rows from the
 * BibleVerse table. Handles single verse, verse range, cross-chapter
 * range, and whole chapter(s).
 */
export async function lookupVerses(
  prisma: PrismaClient,
  ref: ParsedScriptureRef,
): Promise<Array<{ chapter: number; verse: number; text: string }>> {
  const { book, chapter, endChapter, verse, endVerse } = ref;

  if (verse === null) {
    // Whole chapter, possibly a chapter range.
    return prisma.bibleVerse.findMany({
      where: {
        translation: "NWT",
        bookNumber: book.number,
        chapter:
          endChapter > chapter
            ? { gte: chapter, lte: endChapter }
            : chapter,
      },
      orderBy: [{ chapter: "asc" }, { verse: "asc" }],
      select: { chapter: true, verse: true, text: true },
    });
  }

  if (endChapter > chapter) {
    // Cross-chapter verse range: Isaiah 65:17–66:2.
    return prisma.bibleVerse.findMany({
      where: {
        translation: "NWT",
        bookNumber: book.number,
        OR: [
          { chapter, verse: { gte: verse } },
          { chapter: { gt: chapter, lt: endChapter } },
          { chapter: endChapter, verse: { lte: endVerse ?? 999 } },
        ],
      },
      orderBy: [{ chapter: "asc" }, { verse: "asc" }],
      select: { chapter: true, verse: true, text: true },
    });
  }

  // Same-chapter range, or a single verse.
  return prisma.bibleVerse.findMany({
    where: {
      translation: "NWT",
      bookNumber: book.number,
      chapter,
      verse: { gte: verse, lte: endVerse ?? verse },
    },
    orderBy: { verse: "asc" },
    select: { chapter: true, verse: true, text: true },
  });
}

/**
 * Render verse rows as one display string. For multi-verse ranges we
 * inject verse numbers inline so the reader can see where each verse
 * begins; a cross-chapter range uses "C:V" labels so the chapter break
 * is visible.
 */
export function renderVerses(
  rows: Array<{ chapter: number; verse: number; text: string }>,
  options: { crossChapter?: boolean } = {},
): string {
  if (rows.length === 0) return "";
  if (rows.length === 1) return rows[0].text;
  return rows
    .map((r) => {
      const label = options.crossChapter
        ? `${r.chapter}:${r.verse}`
        : String(r.verse);
      return `${label} ${r.text}`;
    })
    .join(" ");
}

/**
 * One-shot: reference string in, verbatim text out. Returns null when
 * the reference doesn't parse or the span isn't in the catalog yet.
 */
export async function textForReference(
  prisma: PrismaClient,
  reference: string,
): Promise<string | null> {
  const parsed = parseScriptureRef(reference);
  if (!parsed) return null;
  const rows = await lookupVerses(prisma, parsed);
  if (rows.length === 0) return null;
  return renderVerses(rows, {
    crossChapter: parsed.endChapter > parsed.chapter,
  });
}

/* ------------------------------------------------------------------ */
/*  Dedupe + fill (the single call all import pipelines go through)    */
/* ------------------------------------------------------------------ */

export interface ScriptureInput {
  reference: string;
  text?: string;
}
export interface ScriptureFilled {
  reference: string;
  text: string;
}

/**
 * Dedupe a pack's scripture list by canonical parsed label, then fill
 * any empty `text` from the BibleVerse catalog. Admin-supplied text
 * always wins — we only touch slots that arrived empty.
 *
 * Called at the DB-write boundary (POST/PATCH /api/admin/content-packs,
 * daily-text import) so every pipeline — WOL, OCLM, Daily Text, manual
 * — benefits without needing to know about the catalog.
 */
export async function fillScriptureTexts(
  prisma: PrismaClient,
  scriptures: ReadonlyArray<ScriptureInput | null | undefined>,
): Promise<ScriptureFilled[]> {
  // Dedupe by canonical label.
  const byLabel = new Map<string, ScriptureInput>();
  for (const s of scriptures) {
    if (!s || typeof s.reference !== "string") continue;
    const trimmed = s.reference.trim();
    if (!trimmed) continue;
    const parsed = parseScriptureRef(trimmed);
    const key = parsed?.label ?? trimmed;
    const canonicalRef = parsed?.label ?? trimmed;
    const existing = byLabel.get(key);
    if (existing) {
      // Keep whichever entry has real text; otherwise keep the first.
      if (!existing.text && s.text) {
        byLabel.set(key, { reference: canonicalRef, text: s.text });
      }
    } else {
      byLabel.set(key, { reference: canonicalRef, text: s.text });
    }
  }

  const out: ScriptureFilled[] = [];
  for (const { reference, text } of byLabel.values()) {
    if (text && text.trim()) {
      out.push({ reference, text: text.trim() });
      continue;
    }
    const filled = (await textForReference(prisma, reference)) ?? "";
    out.push({ reference, text: filled });
  }
  return out;
}
