import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const CATEGORIES = ["PEOPLE", "PLACES", "THINGS", "EVENTS"] as const;

const updateSchema = z.object({
  term: z.string().min(1).max(120).optional(),
  note: z.string().min(1).max(2000).optional(),
  category: z.enum(CATEGORIES).optional(),
  bibleRef: z.string().max(200).nullable().optional(),
  imageUrl: z.string().max(500).nullable().optional(),
});

async function ownerId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await ownerId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const d = parsed.data;

  // updateMany scoped to userId so a user can only edit their own entry.
  const result = await prisma.personalEntry.updateMany({
    where: { id, userId },
    data: {
      ...(d.term !== undefined ? { term: d.term.trim() } : {}),
      ...(d.note !== undefined ? { note: d.note.trim() } : {}),
      ...(d.category !== undefined ? { category: d.category } : {}),
      ...(d.bibleRef !== undefined
        ? { bibleRef: d.bibleRef?.trim() || null }
        : {}),
      ...(d.imageUrl !== undefined
        ? { imageUrl: d.imageUrl?.trim() || null }
        : {}),
    },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  const updated = await prisma.personalEntry.findUnique({ where: { id } });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await ownerId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const result = await prisma.personalEntry.deleteMany({
    where: { id, userId },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
