import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * POST /api/encyclopedia/award/random
 *
 * Grant the caller one random encyclopedia entry they don't yet own.
 * Used for the "surprise reward" flow — game completions, study-guide
 * saves, and any other action worth celebrating with a collectable
 * drop. Callers decide WHEN to invoke (with their own probability
 * roll); the endpoint itself always tries to award something.
 *
 * Prioritises entries with a linked BIBLE_CHARACTER sticker so the
 * user gets a visible, tray-usable collectable — falls back to any
 * un-collected entry if none of those are available.
 *
 * Body: { source?: string } — optional tag stored on the collection
 * row so we can tell later what awarded it ("workbook-save",
 * "hidden-objects-complete", etc.).
 *
 * Returns:
 *   { awarded: true, entry: { id, slug, term, definition, imageUrl } }
 *   { awarded: false, reason: "nothing-left" | "not-signed-in" }
 */
export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json(
      { awarded: false, reason: "not-signed-in" },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { source?: string };
  const source = typeof body.source === "string" ? body.source : "random-drop";

  // Which entry ids does the user already have?
  const owned = await prisma.userEncyclopediaCollection.findMany({
    where: { userId },
    select: { entryId: true },
  });
  const ownedIds = new Set(owned.map((o) => o.entryId));

  // Prefer entries that have a linked sticker AND aren't yet owned —
  // those are the visible collectables. Fall back to any active
  // un-owned entry if none of those are left.
  const preferred = await prisma.encyclopediaEntry.findMany({
    where: {
      isActive: true,
      id: { notIn: [...ownedIds] },
      stickerId: { not: null },
    },
    select: {
      id: true,
      slug: true,
      term: true,
      definition: true,
      imageUrl: true,
      sticker: { select: { path: true } },
    },
    take: 200,
  });

  let pool = preferred;
  if (pool.length === 0) {
    const fallback = await prisma.encyclopediaEntry.findMany({
      where: {
        isActive: true,
        id: { notIn: [...ownedIds] },
      },
      select: {
        id: true,
        slug: true,
        term: true,
        definition: true,
        imageUrl: true,
        sticker: { select: { path: true } },
      },
      take: 200,
    });
    pool = fallback;
  }

  if (pool.length === 0) {
    return NextResponse.json({ awarded: false, reason: "nothing-left" });
  }

  const pick = pool[Math.floor(Math.random() * pool.length)];

  await prisma.userEncyclopediaCollection.create({
    data: {
      userId,
      entryId: pick.id,
      source,
    },
  });

  return NextResponse.json({
    awarded: true,
    entry: {
      id: pick.id,
      slug: pick.slug,
      term: pick.term,
      definition: pick.definition,
      imageUrl: pick.sticker?.path ? `/${pick.sticker.path}` : pick.imageUrl,
    },
  });
}
