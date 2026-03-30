export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import Link from "next/link";

const AGE_GROUP_LABELS: Record<string, string> = {
  LITTLE_ONES: "Little Ones (5-8)",
  YOUTH: "Youth (9-17)",
  ADULT: "Adult (18+)",
  FAMILY: "Family",
};

export const metadata = { title: "Games | Kingdom Companion" };

export default async function GamesPage() {
  const games = await prisma.game.findMany({
    where: { isActive: true },
    orderBy: { title: "asc" },
  });

  if (games.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
          Games
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-lg">
          Games are coming soon! Check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-8">
        Games
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map((game) => (
          <Link
            key={game.id}
            href={`/games/${game.slug}`}
            className="group bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 hover:shadow-lg hover:border-teal-300 dark:hover:border-teal-700 transition"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-medium bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-2 py-1 rounded-full">
                {game.category}
              </span>
              <span className="text-xs text-zinc-400">
                {AGE_GROUP_LABELS[game.ageGroup] ?? game.ageGroup}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition mb-2">
              {game.title}
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              {game.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
