import { prisma } from "@/lib/db";
import { parseDailyText } from "@/lib/content-parser";

export interface DailyTextInput {
  date: Date;
  scriptureRef: string;
  scriptureText: string;
  comment: string;
}

export interface DailyTextResult {
  date: string; // ISO
  title: string;
  instancesCreated: number;
  replaced: boolean;
}

// Which evergreen game engines can be auto-generated from one day's text.
function isDailyGameCompatible(
  slug: string,
  data: {
    vocabulary: string[];
    keyPeople: string[];
    questions: string[];
    keyPhrases: string[];
  },
): boolean {
  switch (slug) {
    case "bible-word-search":
      return data.vocabulary.length >= 5;
    case "scripture-memory-match":
      return false; // only 1 scripture in a daily text
    case "theocratic-trivia":
      return data.questions.length >= 3;
    case "who-am-i":
      return data.keyPeople.length >= 1;
    case "name-that-scripture":
      return true;
    case "cryptogram":
      return data.keyPhrases.length >= 1;
    case "hangman":
      return data.vocabulary.length >= 3;
    default:
      return false;
  }
}

/**
 * Creates the Daily Text content pack for a day and auto-generates compatible
 * game instances. If a Daily Text pack already exists for that calendar day
 * (UTC), it and its game instances are deleted and recreated ("replace"
 * policy). The whole operation is one transaction so a day is never left half
 * written. Shared by the single-entry form and the CSV bulk import.
 */
export async function createOrReplaceDailyText(
  input: DailyTextInput,
): Promise<DailyTextResult> {
  const { date, scriptureRef, scriptureText, comment } = input;
  const extracted = parseDailyText(scriptureRef, scriptureText, comment);

  const dateStr = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  const dayStart = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayEnd = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1),
  );

  return prisma.$transaction(async (tx) => {
    const existing = await tx.contentPack.findFirst({
      where: { source: "DAILY_TEXT", date: { gte: dayStart, lt: dayEnd } },
      select: { id: true },
    });

    let replaced = false;
    if (existing) {
      await tx.gameInstance.deleteMany({
        where: { contentPackId: existing.id },
      });
      await tx.contentPack.delete({ where: { id: existing.id } });
      replaced = true;
    }

    const pack = await tx.contentPack.create({
      data: {
        title: `Daily Text — ${dateStr}`,
        source: "DAILY_TEXT",
        context: "DAILY",
        date,
        sourceText: `${scriptureRef}\n\n${scriptureText}\n\n${comment}`,
        vocabulary: extracted.vocabulary,
        scriptures: [{ reference: scriptureRef, text: scriptureText }],
        keyPeople: extracted.keyPeople,
        themes: extracted.themes,
        questions: extracted.questions,
        keyPhrases: extracted.keyPhrases,
      },
    });

    const games = await tx.game.findMany({ where: { isActive: true } });
    const instances = games
      .filter((g) => isDailyGameCompatible(g.slug, extracted))
      .map((g) => ({
        gameId: g.id,
        contentPackId: pack.id,
        context: "DAILY" as const,
        title: `${g.title} — Daily Text ${dateStr}`,
      }));

    if (instances.length > 0) {
      await tx.gameInstance.createMany({ data: instances });
    }

    return {
      date: date.toISOString(),
      title: pack.title,
      instancesCreated: instances.length,
      replaced,
    };
  });
}
