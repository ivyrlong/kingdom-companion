import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

/**
 * PATCH /api/admin/vocabulary/[id]
 *
 * Body (all optional):
 *   { display?, ageAppropriate?: string[], bibleRef?: string | null }
 *
 * The canonical `term` is NOT editable — merging duplicates would
 * belong to a separate /merge endpoint (out of scope for Phase 2 core).
 *
 * DELETE /api/admin/vocabulary/[id]
 *
 * Removes the term and cascades its category + pack links via the
 * onDelete: Cascade rules in the schema.
 */

const patchSchema = z.object({
  display: z.string().min(1).optional(),
  ageAppropriate: z.array(z.string()).optional(),
  bibleRef: z.string().nullable().optional(),
});

async function authorize() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await authorize())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  try {
    const updated = await prisma.vocabularyTerm.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json({ id: updated.id, display: updated.display });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw e;
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await authorize())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    await prisma.vocabularyTerm.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw e;
  }
}
