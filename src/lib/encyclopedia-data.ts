import { prisma } from "@/lib/db";
import { getEncyclopediaCapabilities } from "@/lib/encyclopedia";
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
  const baseCaps = getEncyclopediaCapabilities(
    ageGroup,
    user.profile ?? undefined,
  );
  if (!baseCaps.enabled) return null;
  // Add the viewer's age group to caps so downstream renderers can pick
  // the matching tier out of contentByTier for each entry. The pure
  // capabilities function stays focused on capabilities; this bundle
  // stitches in the viewer identity.
  const caps = {
    ...baseCaps,
    viewerAgeGroup: ageGroup as
      | "LITTLE_ONES"
      | "YOUTH"
      | "ADULT"
      | "FAMILY",
  };

  const items: EncyclopediaItem[] = [];

  if (caps.receivesCurated) {
    const [entries, collections] = await Promise.all([
      prisma.encyclopediaEntry.findMany({
        // Every entry is available to every viewer — the age adaptation
        // happens through contentByTier at render time, not by hiding
        // rows. `ageGroup` on the entry is now informational (used only
        // to pick a default tier when contentByTier is absent).
        where: { isActive: true },
        orderBy: { term: "asc" },
        include: {
          // Linked sticker (BIBLE_CHARACTER-kind entries have one) —
          // its path is preferred over the free-form imageUrl when
          // present because it's the collectable art the user earned.
          sticker: { select: { path: true } },
        },
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
      // Prefer the linked sticker's path when present; otherwise fall
      // back to the imageUrl the admin uploaded via the image library.
      const imageUrl = e.sticker?.path
        ? `/${e.sticker.path}`
        : e.imageUrl;
      items.push({
        id: e.id,
        slug: e.slug,
        term: e.term,
        definition: e.definition,
        imageUrl,
        bibleRef: e.bibleRef,
        category: e.category as EncyclopediaItem["category"],
        collectedAt: c ? c.collectedAt.toISOString() : null,
        viewedAt: c?.viewedAt ? c.viewedAt.toISOString() : null,
        source: c?.source ?? null,
        kind: "curated",
        // Rich content — nullable. Falls back to `definition` in the UI
        // when a tier for the viewer's ageGroup isn't present.
        era: e.era,
        timeline: e.timeline as EncyclopediaItem["timeline"],
        locations: e.locations,
        contentByTier: e.contentByTier as EncyclopediaItem["contentByTier"],
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
