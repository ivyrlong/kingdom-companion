export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getAgeGroup } from "@/lib/user";
import { getWeekRange } from "@/lib/week";
import { resolveCardImage } from "@/lib/card-image";
import MeetingTabs from "@/components/MeetingTabs";

export const metadata = { title: "Meeting | Kingdom Companion" };

export default async function MeetingPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week: weekParam } = await searchParams;
  const weekOffset = parseInt(weekParam ?? "0", 10) || 0;

  const session = await auth();
  const userAgeGroup = await getAgeGroup(session?.user?.id);

  const { startOfWeek, endOfWeek, label } = getWeekRange(weekOffset);

  const [prepInstances, liveInstances] = await Promise.all([
    prisma.gameInstance.findMany({
      where: {
        context: "MEETING_PREP",
        isActive: true,
        contentPack: {
          meetingWeek: { weekOf: { gte: startOfWeek, lte: endOfWeek } },
        },
      },
      include: { game: true, contentPack: { include: { meetingWeek: true } } },
    }),
    prisma.gameInstance.findMany({
      where: {
        context: "MEETING_LIVE",
        isActive: true,
        contentPack: {
          meetingWeek: { weekOf: { gte: startOfWeek, lte: endOfWeek } },
        },
      },
      include: { game: true, contentPack: { include: { meetingWeek: true } } },
    }),
  ]);

  const toCard = (inst: (typeof prepInstances)[number]) => ({
    id: inst.id,
    href: `/games/${inst.game.slug}?pack=${inst.contentPackId}`,
    category: inst.game.category,
    ageGroup: inst.contentPack.meetingWeek?.title ?? "This Week",
    gameAgeGroup: inst.game.ageGroup,
    title: inst.title,
    description: inst.game.description,
    imageUrl: resolveCardImage(inst.game.cardImages, userAgeGroup),
  });

  const prep = prepInstances.map(toCard);
  const live = liveInstances.map(toCard);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
        Meeting
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8">
        Games to prepare for this week&apos;s meeting and to play during it.
      </p>
      <MeetingTabs
        prep={prep}
        live={live}
        weekOffset={weekOffset}
        weekLabel={label}
      />
    </div>
  );
}
