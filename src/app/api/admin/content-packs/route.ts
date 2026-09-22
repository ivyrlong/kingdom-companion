import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { questionSchema, oclmSectionSchema } from "./_schemas";
import { ingestPackVocabulary } from "@/lib/vocabulary-ingest";

const createSchema = z.object({
  title: z.string().min(1),
  source: z.enum(["WATCHTOWER", "OCLM", "EVERGREEN", "DAILY_TEXT"]),
  context: z.enum(["EVERGREEN", "MEETING_PREP", "MEETING_LIVE", "DAILY"]),
  sourceText: z.string().optional(),
  vocabulary: z.array(z.string()),
  scriptures: z.array(
    z.object({ reference: z.string(), text: z.string().default("") })
  ),
  keyPeople: z.array(z.string()),
  themes: z.array(z.string()),
  questions: z.array(questionSchema),
  keyPhrases: z.array(z.string()),
  meetingWeekId: z.string().optional(),
  generateInstances: z.boolean().default(true),
  // WOL metadata
  issueLabel: z.string().optional(),
  articleNumber: z.number().int().optional(),
  themeScripture: z.object({ reference: z.string() }).optional(),
  sourceUrl: z.string().optional(),
  sourceDocId: z.string().optional(),
  attribution: z.string().optional(),
  // OCLM workbook metadata — set when source=OCLM. JSON columns; admin-only.
  publicationCode: z.string().optional(),
  bibleReadingRange: z.object({ reference: z.string() }).optional(),
  bibleReadingAssignment: z.object({ reference: z.string() }).optional(),
  songs: z.array(z.number().int()).optional(),
  sections: z.array(oclmSectionSchema).optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const context = searchParams.get("context");
  // Default high enough for a full year of daily texts; capped to stay sane.
  const limit = Math.min(
    parseInt(searchParams.get("limit") || "1000", 10) || 1000,
    2000,
  );

  const packs = await prisma.contentPack.findMany({
    where: context
      ? { context: context as "EVERGREEN" | "MEETING_PREP" | "MEETING_LIVE" }
      : undefined,
    include: { meetingWeek: true, _count: { select: { instances: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(packs);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { generateInstances, ...data } = parsed.data;

  const contentPack = await prisma.contentPack.create({
    data: {
      title: data.title,
      source: data.source,
      context: data.context,
      sourceText: data.sourceText,
      vocabulary: data.vocabulary,
      scriptures: data.scriptures,
      keyPeople: data.keyPeople,
      themes: data.themes,
      questions: data.questions,
      keyPhrases: data.keyPhrases,
      meetingWeekId: data.meetingWeekId || null,
      issueLabel: data.issueLabel,
      articleNumber: data.articleNumber,
      themeScripture: data.themeScripture,
      sourceUrl: data.sourceUrl,
      sourceDocId: data.sourceDocId,
      attribution: data.attribution,
      publicationCode: data.publicationCode,
      bibleReadingRange: data.bibleReadingRange,
      bibleReadingAssignment: data.bibleReadingAssignment,
      songs: data.songs,
      sections: data.sections,
    },
  });

  // Ingest this pack's vocabulary + key phrases into the shared catalog.
  // Runs after create (so we have a packId to link) but before the auto-
  // seeded game instances (which don't yet consume the catalog — they
  // still read the pack's snapshot field). Failure here is logged but
  // NOT fatal to pack creation.
  try {
    await ingestPackVocabulary(prisma, contentPack.id, {
      vocabulary: data.vocabulary,
      keyPhrases: data.keyPhrases,
    });
  } catch (e) {
    console.error(
      "[vocab-ingest] failed for pack",
      contentPack.id,
      e instanceof Error ? e.message : String(e),
    );
  }

  // Auto-generate game instances for compatible game engines.
  //
  // For OCLM packs we synthesise a `keyPhrases` list from the imported
  // workbook outline (part titles, scenario tags) so listening games
  // (Meeting Bingo, Tap When You Hear) can auto-seed without admin
  // curation. The synthesised list is only used for compatibility
  // checking; the persisted pack still has whatever was sent in.
  if (generateInstances) {
    const games = await prisma.game.findMany({ where: { isActive: true } });

    const seedingData = {
      source: data.source,
      vocabulary: data.vocabulary,
      scriptures: data.scriptures,
      questions: data.questions,
      keyPeople: data.keyPeople,
      keyPhrases:
        data.source === "OCLM"
          ? derivedOclmKeyPhrases(data)
          : data.keyPhrases,
    };

    const instancesToCreate = [];
    for (const game of games) {
      const compatible = isGameCompatible(game.slug, seedingData);
      if (compatible) {
        instancesToCreate.push({
          gameId: game.id,
          contentPackId: contentPack.id,
          // Listening games belong to the live meeting regardless of the
          // pack's own context — the pack itself can be prep/live/either.
          context: ALWAYS_LIVE_GAMES.has(game.slug)
            ? "MEETING_LIVE"
            : data.context,
          title: `${game.title} — ${data.title}`,
        });
      }
    }

    if (instancesToCreate.length > 0) {
      await prisma.gameInstance.createMany({ data: instancesToCreate });
    }
  }

  return NextResponse.json(contentPack, { status: 201 });
}

/**
 * Build "things you'll hear at this meeting" phrases from an OCLM pack:
 * part titles + ministry scenario tags + existing keyPhrases (if any).
 * These power Meeting Bingo cards and Tap-When-You-Hear without manual
 * authoring. We intentionally do NOT pull from body prose — only the
 * functional headings the chairman/conductor actually announces.
 */
function derivedOclmKeyPhrases(data: {
  keyPhrases: string[];
  sections?: Array<{
    parts: Array<{ title: string; scenarioTag?: string }>;
  }>;
}): string[] {
  const out = new Set<string>(data.keyPhrases);
  for (const s of data.sections ?? []) {
    for (const p of s.parts) {
      if (p.title) out.add(p.title);
      if (p.scenarioTag) out.add(p.scenarioTag);
    }
  }
  return [...out];
}

/**
 * Listening / participation games that only make sense during the live
 * meeting. Their instances are forced to MEETING_LIVE on creation, even
 * if the pack itself was filed as MEETING_PREP.
 */
const ALWAYS_LIVE_GAMES = new Set([
  "quiet-listeners",
  "meeting-bingo",
  "tap-when-you-hear",
]);

/**
 * Check if a game engine can use this content pack based on available data.
 */
function isGameCompatible(
  slug: string,
  data: { source: string; vocabulary: string[]; scriptures: unknown[]; questions: unknown[]; keyPeople: string[]; keyPhrases: string[] }
): boolean {
  switch (slug) {
    case "bible-word-search":
      return data.vocabulary.length >= 5;
    case "scripture-memory-match":
      return data.scriptures.length >= 4;
    case "theocratic-trivia":
      return data.questions.length >= 5;
    case "who-am-i":
      return data.keyPeople.length >= 3;
    case "name-that-scripture":
      return data.scriptures.length >= 4;
    case "crossword":
      return data.vocabulary.length >= 4;
    case "cryptogram":
      return data.keyPhrases.length >= 3 || data.vocabulary.length >= 5;
    case "hangman":
      return data.vocabulary.length >= 5;
    // Meeting live games
    case "quiet-listeners":
      return true; // Always available for meetings
    case "meeting-bingo":
      return data.keyPhrases.length >= 9;
    case "tap-when-you-hear":
      return data.keyPhrases.length >= 5 || data.vocabulary.length >= 5;
    // Meeting-week bonus game — new maze per OCLM pack, no content required.
    // Skipped for Daily Text / Watchtower to avoid 396 extra instances.
    case "meeting-maze":
      return data.source === "OCLM";
    case "coloring-page":
      return false; // Requires uploaded images, not auto-generated
    default:
      return false;
  }
}
