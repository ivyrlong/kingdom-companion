export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import GameTabs from "@/components/GameTabs";

const AGE_GROUP_LABELS: Record<string, string> = {
  LITTLE_ONES: "Little Ones (5-8)",
  YOUTH: "Youth (9-17)",
  ADULT: "Adult (18+)",
  FAMILY: "Family",
};

export const metadata = { title: "Games | Kingdom Companion" };

export default async function GamesPage() {
  // Evergreen games (engines without content packs — classic games)
  const games = await prisma.game.findMany({
    where: { isActive: true },
    orderBy: { title: "asc" },
  });

  // This week's meeting prep game instances
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const meetingPrepInstances = await prisma.gameInstance.findMany({
    where: {
      context: "MEETING_PREP",
      isActive: true,
      contentPack: {
        meetingWeek: {
          weekOf: { gte: startOfWeek, lte: endOfWeek },
        },
      },
    },
    include: { game: true, contentPack: { include: { meetingWeek: true } } },
  });

  const meetingLiveInstances = await prisma.gameInstance.findMany({
    where: {
      context: "MEETING_LIVE",
      isActive: true,
      contentPack: {
        meetingWeek: {
          weekOf: { gte: startOfWeek, lte: endOfWeek },
        },
      },
    },
    include: { game: true, contentPack: { include: { meetingWeek: true } } },
  });

  // Build data for tabs
  const evergreenCards = games.map((game) => ({
    id: game.id,
    href: `/games/${game.slug}`,
    category: game.category,
    ageGroup: AGE_GROUP_LABELS[game.ageGroup] ?? game.ageGroup,
    title: game.title,
    description: game.description,
  }));

  const prepCards = meetingPrepInstances.map((inst) => ({
    id: inst.id,
    href: `/games/${inst.game.slug}?pack=${inst.contentPackId}`,
    category: inst.game.category,
    ageGroup: inst.contentPack.meetingWeek?.title ?? "This Week",
    title: inst.title,
    description: inst.game.description,
  }));

  const liveCards = meetingLiveInstances.map((inst) => ({
    id: inst.id,
    href: `/games/${inst.game.slug}?pack=${inst.contentPackId}`,
    category: inst.game.category,
    ageGroup: inst.contentPack.meetingWeek?.title ?? "This Week",
    title: inst.title,
    description: inst.game.description,
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-8">
        Games
      </h1>

      <GameTabs
        evergreen={evergreenCards}
        meetingPrep={prepCards}
        meetingLive={liveCards}
      />
    </div>
  );
}
