export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { resolveCardImage } from "@/lib/card-image";
import { AGE_GROUP_LABELS } from "@/components/GameCardGrid";
import ExploreTabs from "@/components/ExploreTabs";
import type { EncyclopediaItem } from "@/components/encyclopedia/MyEncyclopedia";

export const metadata = { title: "Explore | Kingdom Companion" };

export default async function ExplorePage() {
  const session = await auth();
  const userId = session?.user?.id;
  const userAgeGroup =
    (session?.user as { ageGroup?: string })?.ageGroup ?? "YOUTH";

  const showEncyclopedia =
    !!userId && (userAgeGroup === "LITTLE_ONES" || userAgeGroup === "FAMILY");

  // Encyclopedia book data (Little Ones / Family only)
  let encyclopediaItems: EncyclopediaItem[] | null = null;

  if (showEncyclopedia) {
    const [entries, collections] = await Promise.all([
      prisma.encyclopediaEntry.findMany({
        where: { isActive: true, ageGroup: { in: ["LITTLE_ONES", "FAMILY"] } },
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

    encyclopediaItems = entries.map((e) => {
      const c = byEntry.get(e.id);
      return {
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
      };
    });
  }

  // Evergreen games — the always-available standalone games.
  const games = await prisma.game.findMany({
    where: { isActive: true },
    orderBy: { title: "asc" },
  });

  const gameCards = games.map((game) => ({
    id: game.id,
    href: `/games/${game.slug}`,
    category: game.category,
    ageGroup: AGE_GROUP_LABELS[game.ageGroup] ?? game.ageGroup,
    gameAgeGroup: game.ageGroup,
    title: game.title,
    description: game.description,
    imageUrl: resolveCardImage(game.cardImages, userAgeGroup),
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-8">
        Explore
      </h1>
      <ExploreTabs games={gameCards} encyclopediaItems={encyclopediaItems} />
    </div>
  );
}
