export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getTodayRange } from "@/lib/week";
import { resolveCardImage } from "@/lib/card-image";
import GameCardGrid from "@/components/GameCardGrid";

export default async function Home() {
  const session = await auth();

  // Logged-out visitors get the marketing splash.
  if (!session?.user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-gradient-to-br from-peach-50 to-coral-50 dark:from-zinc-950 dark:to-zinc-900 px-4">
        <div className="text-center max-w-2xl">
          <h1 className="text-5xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
            Kingdom{" "}
            <span className="text-coral-600 dark:text-coral-400">
              Companion
            </span>
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-8">
            Fun Bible-themed games for the whole family. Learn scriptures,
            explore Bible stories, and grow in knowledge — one game at a time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-3 bg-coral-600 hover:bg-coral-700 text-white font-medium rounded-xl text-lg transition"
            >
              Get Started
            </Link>
            <Link
              href="/games"
              className="px-8 py-3 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-xl text-lg border border-zinc-200 dark:border-zinc-700 transition"
            >
              Browse Games
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Logged-in home: today's games front and centre.
  const userAgeGroup =
    (session.user as { ageGroup?: string }).ageGroup ?? "YOUTH";
  const firstName = (session.user.name ?? "friend").split(" ")[0];

  const { todayStart, todayEnd } = getTodayRange();
  const dailyInstances = await prisma.gameInstance.findMany({
    where: {
      context: "DAILY",
      isActive: true,
      contentPack: {
        source: "DAILY_TEXT",
        date: { gte: todayStart, lt: todayEnd },
      },
    },
    include: { game: true, contentPack: true },
  });

  const todayCards = dailyInstances.map((inst) => ({
    id: inst.id,
    href: `/games/${inst.game.slug}?pack=${inst.contentPackId}`,
    category: inst.game.category,
    ageGroup: "Daily Text",
    gameAgeGroup: inst.game.ageGroup,
    title: inst.title,
    description: inst.game.description,
    imageUrl: resolveCardImage(inst.game.cardImages, userAgeGroup),
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
        Hi, {firstName}! 👋
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8">
        Here are today&apos;s games from the Daily Text.
      </p>

      {/* Today's games */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
          Today
        </h2>
        {todayCards.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
            <p className="text-zinc-500 dark:text-zinc-400">
              No Daily Text games for today yet. In the meantime, explore the
              games library below!
            </p>
          </div>
        ) : (
          <GameCardGrid cards={todayCards} />
        )}
      </section>

      {/* Where to next */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/games"
          className="group bg-gradient-to-br from-coral-50 to-peach-50 dark:from-zinc-900 dark:to-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 hover:shadow-lg hover:border-coral-300 dark:hover:border-coral-700 transition"
        >
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 group-hover:text-coral-600 dark:group-hover:text-coral-400 transition">
            Explore →
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            All the games, anytime — plus your Bible sticker encyclopedia.
          </p>
        </Link>
        <Link
          href="/meeting"
          className="group bg-gradient-to-br from-sky-50 to-violet-50 dark:from-zinc-900 dark:to-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 hover:shadow-lg hover:border-violet-300 dark:hover:border-violet-700 transition"
        >
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition">
            Meeting →
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Get ready for this week&apos;s meeting and play along during it.
          </p>
        </Link>
      </section>
    </div>
  );
}
