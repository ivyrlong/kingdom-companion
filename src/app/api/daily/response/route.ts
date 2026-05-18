import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  contentPackId: z.string().min(1),
  questionIndex: z.number().int().min(0),
  question: z.string().min(1).max(500),
  response: z.string().max(4000),
});

/**
 * POST /api/daily/response
 * Upserts the signed-in user's written answer to one daily-text question.
 * Empty response deletes the row (so a cleared box doesn't linger).
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
  const { contentPackId, questionIndex, question, response } = parsed.data;
  const userId = session.user.id;
  const key = {
    userId_contentPackId_questionIndex: {
      userId,
      contentPackId,
      questionIndex,
    },
  };

  if (!response.trim()) {
    await prisma.dailyResponse
      .delete({ where: key })
      .catch(() => {}); // nothing saved yet — fine
    return NextResponse.json({ success: true, cleared: true });
  }

  await prisma.dailyResponse.upsert({
    where: key,
    create: { userId, contentPackId, questionIndex, question, response },
    update: { question, response },
  });

  return NextResponse.json({ success: true });
}
