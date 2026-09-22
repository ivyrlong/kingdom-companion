import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { placementsSchema } from "@/lib/paradise";

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

// ── GET: fetch one of the caller's pages ──────────────────────────────
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const page = await prisma.paradisePage.findFirst({
    where: { id, userId },
    include: {
      scene: { select: { id: true, slug: true, name: true, path: true } },
    },
  });
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(page);
}

// ── PATCH: update name and/or placements (save + rename) ──────────────
const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  placements: placementsSchema.optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Ownership check: updateMany + count so a mismatched user gets 404,
  // not silent success.
  const owned = await prisma.paradisePage.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.paradisePage.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.placements !== undefined
        ? { placements: parsed.data.placements }
        : {}),
    },
    include: {
      scene: { select: { id: true, slug: true, name: true, path: true } },
    },
  });
  return NextResponse.json(updated);
}

// ── DELETE: remove the page ──────────────────────────────────────────
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const owned = await prisma.paradisePage.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.paradisePage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
