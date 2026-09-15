import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { placementsSchema } from "@/lib/paradise";

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

// ── GET: list this user's pages ───────────────────────────────────────
export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pages = await prisma.paradisePage.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      scene: { select: { id: true, slug: true, name: true, path: true } },
    },
  });
  return NextResponse.json(pages);
}

// ── POST: create a new page ───────────────────────────────────────────
const createSchema = z.object({
  sceneId: z.string().min(1),
  name: z.string().min(1).max(80).optional(),
  placements: placementsSchema.optional(),
});

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Confirm the scene exists (and is active — a deactivated scene can't
  // start a new page even if the id is still floating around).
  const scene = await prisma.scene.findUnique({
    where: { id: parsed.data.sceneId },
    select: { id: true, name: true, isActive: true },
  });
  if (!scene || !scene.isActive) {
    return NextResponse.json({ error: "Scene not found" }, { status: 404 });
  }

  const page = await prisma.paradisePage.create({
    data: {
      userId,
      sceneId: scene.id,
      name: parsed.data.name?.trim() || `My ${scene.name}`,
      placements: parsed.data.placements ?? [],
    },
    include: {
      scene: { select: { id: true, slug: true, name: true, path: true } },
    },
  });
  return NextResponse.json(page, { status: 201 });
}
