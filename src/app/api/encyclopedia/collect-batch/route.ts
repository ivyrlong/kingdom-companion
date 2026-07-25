import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import {
  getEncyclopediaCapabilities,
  curatedAgeFilter,
} from "@/lib/encyclopedia";

/**
 * POST /api/encyclopedia/collect-batch
 *
 * Body: { tokens: string[], source?: string }
 *
 * Normalises each token, matches against curated EncyclopediaEntry slugs
 * AND triggers, and upserts a UserEncyclopediaCollection row for every
 * newly-matched, capability-visible entry.
 *
 * Used by the OCLM Meeting Live tab: when a user opens the live meeting
 * for the week, we fire once with vocabulary + part titles + key people,
 * and any matching entries silently join the user's Encyclopedia. The
 * response tells the client how many were newly added so it can flash
 * a small "+N words" toast.
 *
 * Returns { newlyCollected: number, entries: [{term, slug}] } — safe to
 * ignore server-side failures on a per-token basis; this is a non-
 * critical enrichment surface.
 */

const bodySchema = z.object({
  tokens: z.array(z.string()).min(1).max(200),
  source: z.string().optional(),
});

function normalize(token: string): string {
  return token
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { tokens, source } = parsed.data;
  const userId = session.user.id;

  // Capability gate: users who don't receive curated findings get nothing.
  // (Same rule the Encyclopedia tab enforces — see lib/encyclopedia.ts.)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ageGroup: true,
      profile: {
        select: { encyclopediaMode: true, receiveCuratedFindings: true },
      },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const caps = getEncyclopediaCapabilities(user.ageGroup, user.profile ?? undefined);
  if (!caps.enabled || !caps.receivesCurated) {
    return NextResponse.json({ newlyCollected: 0, entries: [] });
  }

  // Fetch every entry the viewer can see + normalise their triggers.
  const entries = await prisma.encyclopediaEntry.findMany({
    where: {
      isActive: true,
      ageGroup: { in: curatedAgeFilter(user.ageGroup) as never },
    },
    select: { id: true, slug: true, term: true, triggers: true },
  });

  // Build slug/trigger → entry lookup.
  const byKey = new Map<string, { id: string; slug: string; term: string }>();
  for (const e of entries) {
    byKey.set(e.slug, { id: e.id, slug: e.slug, term: e.term });
    if (Array.isArray(e.triggers)) {
      for (const t of e.triggers as unknown[]) {
        if (typeof t !== "string") continue;
        const k = normalize(t);
        if (k && !byKey.has(k)) {
          byKey.set(k, { id: e.id, slug: e.slug, term: e.term });
        }
      }
    }
  }

  // Match incoming tokens.
  const matchedEntries = new Map<string, { id: string; slug: string; term: string }>();
  for (const token of tokens) {
    const k = normalize(token);
    if (!k) continue;
    const hit = byKey.get(k);
    if (hit) matchedEntries.set(hit.id, hit);
  }
  if (matchedEntries.size === 0) {
    return NextResponse.json({ newlyCollected: 0, entries: [] });
  }

  // Diff against what the user already has, so we can report the
  // truly-new count.
  const existing = await prisma.userEncyclopediaCollection.findMany({
    where: { userId, entryId: { in: [...matchedEntries.keys()] } },
    select: { entryId: true },
  });
  const alreadyCollected = new Set(existing.map((c) => c.entryId));

  const newEntries = [...matchedEntries.values()].filter(
    (e) => !alreadyCollected.has(e.id),
  );

  // Upsert each new one. createMany would be faster but silently skips
  // dupes only with skipDuplicates AND requires a unique compound; we
  // already computed the diff, so plain create is fine.
  if (newEntries.length > 0) {
    await prisma.userEncyclopediaCollection.createMany({
      data: newEntries.map((e) => ({
        userId,
        entryId: e.id,
        source: source ?? null,
      })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({
    newlyCollected: newEntries.length,
    entries: newEntries.map((e) => ({ term: e.term, slug: e.slug })),
  });
}
