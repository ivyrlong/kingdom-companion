import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  weekOf: z.string().transform((s) => new Date(s)),
  title: z.string().min(1),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const weeks = await prisma.meetingWeek.findMany({
    include: {
      contentPacks: {
        include: { _count: { select: { instances: true } } },
      },
    },
    orderBy: { weekOf: "desc" },
    take: 20,
  });

  return NextResponse.json(weeks);
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

  const week = await prisma.meetingWeek.upsert({
    where: { weekOf: parsed.data.weekOf },
    update: { title: parsed.data.title },
    create: parsed.data,
  });

  return NextResponse.json(week, { status: 201 });
}
