export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export const metadata = { title: "Daily Responses | Kingdom Companion" };

export default async function DailyResponsesPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    redirect("/");
  }

  const responses = await prisma.dailyResponse.findMany({
    orderBy: { updatedAt: "desc" },
    take: 300,
    include: {
      user: { select: { name: true, email: true } },
      contentPack: { select: { title: true, date: true } },
    },
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
        Daily Responses
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8">
        What young ones wrote in answer to the Daily Text questions. Most
        recent first.
      </p>

      {responses.length === 0 ? (
        <p className="text-zinc-500 dark:text-zinc-400">No responses yet.</p>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                  Day
                </th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                  Who
                </th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                  Question
                </th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                  Answer
                </th>
                <th className="text-right px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody>
              {responses.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-zinc-100 dark:border-zinc-800/50 last:border-0 align-top"
                >
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                    {r.contentPack.date
                      ? new Date(r.contentPack.date).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" },
                        )
                      : r.contentPack.title}
                  </td>
                  <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                    {r.user.name ?? r.user.email}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 max-w-xs">
                    {r.question}
                  </td>
                  <td className="px-4 py-3 text-zinc-800 dark:text-zinc-100 whitespace-pre-wrap">
                    {r.response}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-400 whitespace-nowrap">
                    {new Date(r.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
