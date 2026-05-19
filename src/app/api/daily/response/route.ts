import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  contentPackId: z.string().min(1),
  questionIndex: z.number().int().min(0),
  question: z.string().min(1).max(500),
  response: z.string().max(4000),
  // Watchtower study prep state (optional): the Youth's built or
  // multiple-choice answer, carried from meeting prep into Meeting Live.
  data: z
    .object({
      mode: z.enum(["build", "mc"]).optional(),
      builtAnswer: z.string().max(2000).optional(),
    })
    .strict()
    .optional(),
});

/**
 * POST /api/daily/response
 * Upserts the signed-in user's answer to one question (daily text or
 * Watchtower study). The free-text note lives in `response`; an optional
 * built/selected answer lives in `data`. The row is removed only when both
 * are empty, so a cleared note doesn't wipe a prepared answer (and vice versa).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { contentPackId, questionIndex, question, response, data } =
    parsed.data;
  const userId = session.user.id;
  const key = {
    userId_contentPackId_questionIndex: {
      userId,
      contentPackId,
      questionIndex,
    },
  };

  const payloadData =
    data && (data.mode || data.builtAnswer?.trim()) ? data : undefined;
  const hasData = payloadData !== undefined;

  if (!response.trim() && !hasData) {
    await prisma.dailyResponse
      .delete({ where: key })
      .catch(() => {}); // nothing saved yet — fine
    return NextResponse.json({ success: true, cleared: true });
  }

  await prisma.dailyResponse.upsert({
    where: key,
    create: {
      userId,
      contentPackId,
      questionIndex,
      question,
      response,
      ...(payloadData !== undefined ? { data: payloadData } : {}),
    },
    update: {
      question,
      response,
      ...(payloadData !== undefined ? { data: payloadData } : {}),
    },
  });

  return NextResponse.json({ success: true });
}
