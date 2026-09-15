export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getAgeGroup } from "@/lib/user";
import { resolveCardImage } from "@/lib/card-image";
import { loadEncyclopediaBundle } from "@/lib/encyclopedia-data";
import { AGE_GROUP_LABELS } from "@/components/GameCardGrid";
import ExploreTabs from "@/components/ExploreTabs";

export const metadata = { title: "Explore | Kingdom Companion" };

export default async function ExplorePage() {
  const session = await auth();
  const userId = session?.user?.id;
  const userAgeGroup = await getAgeGroup(userId);

  const bundle = await loadEncyclopediaBundle(userId);

  // Evergreen games — the always-available standalone games.
  const allGames = await prisma.game.findMany({
    where: { isActive: true },
    orderBy: { title: "asc" },
  });

  // Games explicitly for kids and youth only — hidden from adults even
  // though the row's ageGroup label is broader. `Game.ageGroup` today is
  // a single-value badge, not a filter, so this exclusion lives here.
  const KID_YOUTH_ONLY_SLUGS = new Set(["paradise-builder"]);
  const games =
    userAgeGroup === "ADULT"
      ? allGames.filter((g) => !KID_YOUTH_ONLY_SLUGS.has(g.slug))
      : allGames;

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
      <ExploreTabs games={gameCards} encyclopedia={bundle} />
    </div>
  );
}
