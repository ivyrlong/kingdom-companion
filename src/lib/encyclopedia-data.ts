import { prisma } from "@/lib/db";
import {
  getEncyclopediaCapabilities,
  curatedAgeFilter,
} from "@/lib/encyclopedia";
import type {
  EncyclopediaItem,
  EncyclopediaCaps,
} from "@/components/encyclopedia/MyEncyclopedia";

export interface EncyclopediaBundle {
  items: EncyclopediaItem[];
  caps: EncyclopediaCaps;
}

/**
 * Builds a user's encyclopedia: capability-resolved curated finds (if they
 * receive them) merged with their personal entries (if they can author).
 * Returns null when there is no signed-in user. Shared by the Explore tab
 * and the standalone /encyclopedia route so they never drift.
 */
export async function loadEncyclopediaBundle(
  userId: string | undefined | null,
): Promise<EncyclopediaBundle | null> {
  if (!userId) return null;

  // Age group is read from the DB (source of truth) — not the session token,
  // which goes stale after a profile age-group change until the JWT re-signs.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ageGroup: true,
      profile: {
        select: { encyclopediaMode: true, receiveCuratedFindings: true },
      },
    },
  });
  if (!user) return null;

  const ageGroup = user.ageGroup;
  const caps = getEncyclopediaCapabilities(ageGroup, user.profile ?? undefined);
  if (!caps.enabled) return null;

  const items: EncyclopediaItem[] = [];

  if (caps.receivesCurated) {
    const [entries, collections] = await Promise.all([
      prisma.encyclopediaEntry.findMany({
        where: {
          isActive: true,
          ageGroup: { in: curatedAgeFilter(ageGroup) as never },
        },
        orderBy: { term: "asc" },
      }),
      prisma.userEncyclopediaCollection.findMany({
        where: { userId },
        select: {
          entryId: true,
          collectedAt: true,
          viewedAt: true,
          source: true,
        },
      }),
    ]);
    const byEntry = new Map(collections.map((c) => [c.entryId, c]));
    for (const e of entries) {
      const c = byEntry.get(e.id);
      items.push({
        id: e.id,
        slug: e.slug,
        term: e.term,
        definition: e.definition,
        imageUrl: e.imageUrl,
        bibleRef: e.bibleRef,
        category: e.category as EncyclopediaItem["category"],
        collectedAt: c ? c.collectedAt.toISOString() : null,
        viewedAt: c?.viewedAt ? c.viewedAt.toISOString() : null,
        source: c?.source ?? null,
        kind: "curated",
      });
    }
  }

  if (caps.canAuthor) {
    const personal = await prisma.personalEntry.findMany({
      where: { userId },
      orderBy: { term: "asc" },
    });
    for (const p of personal) {
      const created = p.createdAt.toISOString();
      items.push({
        id: p.id,
        slug: p.id,
        term: p.term,
        definition: p.note,
        imageUrl: p.imageUrl,
        bibleRef: p.bibleRef,
        category: p.category as EncyclopediaItem["category"],
        collectedAt: created,
        viewedAt: created,
        source: null,
        kind: "personal",
      });
    }
  }

  return { items, caps };
}
