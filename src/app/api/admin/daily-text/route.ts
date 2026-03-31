import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { parseDailyText } from "@/lib/content-parser";

const createSchema = z.object({
  date: z.string().transform((s) => new Date(s)),
  scriptureRef: z.string().min(1),
  scriptureText: z.string().min(1),
  comment: z.string().min(1),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "14");

  const dailyPacks = await prisma.contentPack.findMany({
    where: { source: "DAILY_TEXT" },
    include: { _count: { select: { instances: true } } },
    orderBy: { date: "desc" },
    take: limit,
  });

  return NextResponse.json(dailyPacks);
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

  const { date, scriptureRef, scriptureText, comment } = parsed.data;

  // Parse the combined text to extract vocabulary, people, phrases
  const extracted = parseDailyText(scriptureRef, scriptureText, comment);

  const dateStr = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const contentPack = await prisma.contentPack.create({
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

  // Auto-generate game instances for compatible engines
  const games = await prisma.game.findMany({ where: { isActive: true } });
  const instancesToCreate = [];

  for (const game of games) {
    const compatible = isDailyGameCompatible(game.slug, extracted);
    if (compatible) {
      instancesToCreate.push({
        gameId: game.id,
        contentPackId: contentPack.id,
        context: "DAILY" as const,
        title: `${game.title} — Daily Text ${dateStr}`,
      });
    }
  }

  if (instancesToCreate.length > 0) {
    await prisma.gameInstance.createMany({ data: instancesToCreate });
  }

  return NextResponse.json(
    { ...contentPack, instancesCreated: instancesToCreate.length },
    { status: 201 }
  );
}

function isDailyGameCompatible(
  slug: string,
  data: { vocabulary: string[]; keyPeople: string[]; questions: string[]; keyPhrases: string[] }
): boolean {
  switch (slug) {
    case "bible-word-search":
      return data.vocabulary.length >= 5;
    case "scripture-memory-match":
      // Daily text only has 1 scripture, not enough for a match game
      return false;
    case "theocratic-trivia":
      return data.questions.length >= 3;
    case "who-am-i":
      return data.keyPeople.length >= 1;
    case "name-that-scripture":
      // 1 scripture is enough for a quick daily challenge
      return true;
    case "cryptogram":
      return data.keyPhrases.length >= 1;
    case "hangman":
      return data.vocabulary.length >= 3;
    default:
      return false;
  }
}
