import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const startSchema = z.object({
  gameId: z.string(),
});

const endSchema = z.object({
  sessionId: z.string(),
  score: z.number().int().min(0),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = startSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const gameSession = await prisma.gameSession.create({
    data: {
      userId: session.user.id,
      gameId: parsed.data.gameId,
    },
  });

  return NextResponse.json({ sessionId: gameSession.id }, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = endSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const gameSession = await prisma.gameSession.findUnique({
    where: { id: parsed.data.sessionId },
  });

  if (!gameSession || gameSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const [updatedSession] = await prisma.$transaction([
    prisma.gameSession.update({
      where: { id: parsed.data.sessionId },
      data: {
        status: "COMPLETED",
        score: parsed.data.score,
        endedAt: new Date(),
      },
    }),
    prisma.score.create({
      data: {
        userId: session.user.id,
        gameId: gameSession.gameId,
        value: parsed.data.score,
      },
    }),
    prisma.profile.update({
      where: { userId: session.user.id },
      data: {
        xp: { increment: Math.floor(parsed.data.score / 10) },
      },
    }),
  ]);

  return NextResponse.json({ session: updatedSession });
}
