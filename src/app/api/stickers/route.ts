import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/stickers — active stickers available to the caller.
 *
 * Non-collectable kinds (modern PERSON, animals, plants, homes, sky)
 * are always returned so kids can build a paradise page from day one.
 *
 * BIBLE_CHARACTER stickers are COLLECTABLES — they only appear once
 * the caller has discovered the linked EncyclopediaEntry (which
 * happens by playing Who Am I? / Trivia, saving a study guide, random
 * game-completion drops, or auto-collect from Meeting Live content).
 *
 * Unlinked BIBLE_CHARACTER stickers (no matching EncyclopediaEntry
 * yet) are hidden from everyone — they can't be earned, so they'd
 * just be un-earnable clutter.
 */
export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // The full active library, plus the sticker→encyclopedia link so we
  // can gate BIBLE_CHARACTER kinds.
  const stickers = await prisma.sticker.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      kind: true,
      path: true,
      altText: true,
      character: { select: { name: true, familyName: true, role: true } },
      encyclopediaEntry: { select: { id: true } },
    },
  });

  // Load the caller's collected encyclopedia entry ids in one shot so
  // we can filter without N+1 queries.
  const collected = await prisma.userEncyclopediaCollection.findMany({
    where: { userId },
    select: { entryId: true },
  });
  const collectedEntryIds = new Set(collected.map((c) => c.entryId));

  const visible = stickers
    .filter((s) => {
      if (s.kind !== "BIBLE_CHARACTER") return true;
      if (!s.encyclopediaEntry) return false; // unearn-able
      return collectedEntryIds.has(s.encyclopediaEntry.id);
    })
    // Trim the encyclopediaEntry helper field out of the response — the
    // client doesn't need it, and it was only fetched for the gate.
    .map(({ encyclopediaEntry: _drop, ...rest }) => rest);

  return NextResponse.json(visible);
}
