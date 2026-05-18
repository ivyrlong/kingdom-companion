import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { createOrReplaceDailyText } from "@/lib/daily-text";

const createSchema = z.object({
  date: z.string().transform((s) => new Date(s)),
  scriptureRef: z.string().min(1),
  scriptureText: z.string().min(1),
  comment: z.string().min(1),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return false;
  }
  return true;
}

export async function GET(req: Request) {
  if (!(await requireAdmin())) {
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
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  if (isNaN(parsed.data.date.getTime())) {
    return NextResponse.json(
      { error: "Invalid date" },
      { status: 400 },
    );
  }

  const result = await createOrReplaceDailyText(parsed.data);
  return NextResponse.json(result, { status: 201 });
}
