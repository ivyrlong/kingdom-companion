export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export const metadata = { title: "Profile | Kingdom Companion" };

const AGE_GROUP_LABELS: Record<string, string> = {
  LITTLE_ONES: "Little Ones (5-8)",
  YOUTH: "Youth (9-17)",
  ADULT: "Adult (18+)",
  FAMILY: "Family",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      profile: { include: { badges: true } },
      scores: {
        include: { game: true },
        orderBy: { value: "desc" },
        take: 10,
      },
      _count: { select: { gameSessions: true } },
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 mb-8">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-coral-100 dark:bg-coral-900/30 rounded-full flex items-center justify-center text-3xl font-bold text-coral-600 dark:text-coral-400">
            {user.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {user.profile?.displayName ?? user.name}
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400">
              {AGE_GROUP_LABELS[user.ageGroup] ?? user.ageGroup}
              {user.profile?.congregation &&
                ` \u00B7 ${user.profile.congregation}`}
            </p>
            <div className="flex gap-4 mt-2 text-sm">
              <span className="text-coral-600 dark:text-coral-400 font-medium">
                Level {user.profile?.level ?? 1}
              </span>
              <span className="text-zinc-400">
                {user.profile?.xp ?? 0} XP
              </span>
              <span className="text-zinc-400">
                {user._count.gameSessions} games played
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Badges */}
      {user.profile?.badges && user.profile.badges.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            Badges
          </h2>
          <div className="flex flex-wrap gap-3">
            {user.profile.badges.map((badge) => (
              <div
                key={badge.id}
                className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-4 py-2 rounded-full text-sm font-medium"
                title={badge.description}
              >
                {badge.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* High Scores */}
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
          Top Scores
        </h2>
        {user.scores.length === 0 ? (
          <p className="text-zinc-500 dark:text-zinc-400">
            No scores yet. Play some games to see your results here!
          </p>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Game
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Score
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {user.scores.map((score) => (
                  <tr
                    key={score.id}
                    className="border-b border-zinc-100 dark:border-zinc-800/50 last:border-0"
                  >
                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                      {score.game.title}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-coral-600 dark:text-coral-400">
                      {score.value.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-400">
                      {new Date(score.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
