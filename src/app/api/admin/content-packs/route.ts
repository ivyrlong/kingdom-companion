import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1),
  source: z.enum(["WATCHTOWER", "OCLM", "EVERGREEN"]),
  context: z.enum(["EVERGREEN", "MEETING_PREP", "MEETING_LIVE", "DAILY"]),
  sourceText: z.string().optional(),
  vocabulary: z.array(z.string()),
  scriptures: z.array(
    z.object({ reference: z.string(), text: z.string().default("") })
  ),
  keyPeople: z.array(z.string()),
  themes: z.array(z.string()),
  questions: z.array(
    z.object({
      question: z.string(),
      answer: z.string().default(""),
      options: z.array(z.string()).default([]),
    })
  ),
  keyPhrases: z.array(z.string()),
  meetingWeekId: z.string().optional(),
  generateInstances: z.boolean().default(true),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const context = searchParams.get("context");

  const packs = await prisma.contentPack.findMany({
    where: context
      ? { context: context as "EVERGREEN" | "MEETING_PREP" | "MEETING_LIVE" }
      : undefined,
    include: { meetingWeek: true, _count: { select: { instances: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
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
    },
  });

  // Auto-generate game instances for compatible game engines
  if (generateInstances) {
    const games = await prisma.game.findMany({ where: { isActive: true } });

    const instancesToCreate = [];
    for (const game of games) {
      const compatible = isGameCompatible(game.slug, data);
      if (compatible) {
        instancesToCreate.push({
          gameId: game.id,
          contentPackId: contentPack.id,
          context: data.context,
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
 * Check if a game engine can use this content pack based on available data.
 */
function isGameCompatible(
  slug: string,
  data: { vocabulary: string[]; scriptures: unknown[]; questions: unknown[]; keyPeople: string[]; keyPhrases: string[] }
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
    // Meeting live games
    case "meeting-bingo":
      return data.keyPhrases.length >= 9;
    case "tap-when-you-hear":
      return data.keyPhrases.length >= 5 || data.vocabulary.length >= 5;
    default:
      return false;
  }
}
