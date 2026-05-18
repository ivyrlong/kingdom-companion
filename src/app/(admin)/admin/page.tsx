export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = { title: "Admin Dashboard | Kingdom Companion" };

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    redirect("/");
  }

  const [userCount, gameCount, sessionCount, recentSessions] =
    await Promise.all([
      prisma.user.count(),
      prisma.game.count(),
      prisma.gameSession.count(),
      prisma.gameSession.findMany({
        take: 20,
        orderBy: { startedAt: "desc" },
        include: { user: true, game: true },
      }),
    ]);

  const gameStats = await prisma.gameSession.groupBy({
    by: ["gameId"],
    _count: { id: true },
    _avg: { score: true },
    orderBy: { _count: { id: "desc" } },
  });

  const games = await prisma.game.findMany();
  const gameMap = new Map(games.map((g) => [g.id, g]));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Admin Dashboard
        </h1>
        <div className="flex gap-3">
          <Link
            href="/admin/content"
            className="px-4 py-2 bg-coral-600 hover:bg-coral-700 text-white text-sm font-medium rounded-lg transition"
          >
            Content Manager
          </Link>
          <Link
            href="/admin/images"
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition"
          >
            Images
          </Link>
          <Link
            href="/admin/encyclopedia"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition"
          >
            Encyclopedia
          </Link>
          <Link
            href="/admin/games"
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition"
          >
            Game Images
          </Link>
          <Link
            href="/admin/daily-responses"
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition"
          >
            Daily Responses
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        {[
          { label: "Total Users", value: userCount },
          { label: "Active Games", value: gameCount },
          { label: "Total Sessions", value: sessionCount },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6"
          >
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {stat.label}
            </p>
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">
              {stat.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Game Performance */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
          Game Performance
        </h2>
        {gameStats.length === 0 ? (
          <p className="text-zinc-500 dark:text-zinc-400">
            No game sessions yet.
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
                    Plays
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Avg Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {gameStats.map((stat) => (
                  <tr
                    key={stat.gameId}
                    className="border-b border-zinc-100 dark:border-zinc-800/50 last:border-0"
                  >
                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                      {gameMap.get(stat.gameId)?.title ?? stat.gameId}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-300">
                      {stat._count.id}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-coral-600 dark:text-coral-400">
                      {Math.round(stat._avg.score ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
          Recent Activity
        </h2>
        {recentSessions.length === 0 ? (
          <p className="text-zinc-500 dark:text-zinc-400">No activity yet.</p>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    User
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Game
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Score
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-zinc-100 dark:border-zinc-800/50 last:border-0"
                  >
                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                      {s.user.name ?? s.user.email}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {s.game.title}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-coral-600 dark:text-coral-400">
                      {s.score}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          s.status === "COMPLETED"
                            ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                            : s.status === "IN_PROGRESS"
                              ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-400">
                      {new Date(s.startedAt).toLocaleDateString()}
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
