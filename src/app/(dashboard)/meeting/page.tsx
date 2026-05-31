export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getAgeGroup } from "@/lib/user";
import { getWeekRange } from "@/lib/week";
import { resolveCardImage } from "@/lib/card-image";
import MeetingTabs from "@/components/MeetingTabs";
import type {
  StudyQuestion,
  SavedStudyResponse,
} from "@/components/WatchtowerStudyPanel";
import type { WorkbookSection } from "@/components/WorkbookPanel";

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
    source: inst.contentPack.source,
  });

  const prep = prepInstances.map(toCard);
  const live = liveInstances.map(toCard);

  // The week's midweek + weekend packs. Each meeting carries at most one
  // pack; prep + live tabs share it so notes persist into the meeting.
  const [watchtowerPack, oclmPack] = await Promise.all([
    prisma.contentPack.findFirst({
      where: {
        source: "WATCHTOWER",
        meetingWeek: { weekOf: { gte: startOfWeek, lte: endOfWeek } },
      },
      orderBy: { createdAt: "asc" },
      include: { images: true },
    }),
    prisma.contentPack.findFirst({
      where: {
        source: "OCLM",
        meetingWeek: { weekOf: { gte: startOfWeek, lte: endOfWeek } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  let study: {
    ageGroup: string;
    packId: string;
    title: string;
    imageUrl: string | null;
    questions: StudyQuestion[];
    scriptures: Array<{ reference: string; text: string }>;
    savedResponses: Record<number, SavedStudyResponse>;
    attribution: string | null;
    sourceUrl: string | null;
  } | null = null;

  if (watchtowerPack) {
    const userId = session?.user?.id;
    const responses = userId
      ? await prisma.dailyResponse.findMany({
          where: { userId, contentPackId: watchtowerPack.id },
        })
      : [];
    const savedResponses: Record<number, SavedStudyResponse> = {};
    for (const r of responses) {
      savedResponses[r.questionIndex] = {
        response: r.response,
        data: (r.data as SavedStudyResponse["data"]) ?? null,
      };
    }
    const firstImage = watchtowerPack.images[0];
    const imageUrl = firstImage
      ? firstImage.path.startsWith("/")
        ? firstImage.path
        : `/${firstImage.path}`
      : null;
    study = {
      ageGroup: userAgeGroup,
      packId: watchtowerPack.id,
      title: watchtowerPack.title,
      imageUrl,
      questions: Array.isArray(watchtowerPack.questions)
        ? (watchtowerPack.questions as unknown as StudyQuestion[])
        : [],
      scriptures: Array.isArray(watchtowerPack.scriptures)
        ? (watchtowerPack.scriptures as unknown as Array<{
            reference: string;
            text: string;
          }>)
        : [],
      savedResponses,
      attribution: watchtowerPack.attribution ?? null,
      sourceUrl: watchtowerPack.sourceUrl ?? null,
    };
  }

  const workbook = oclmPack
    ? {
        ageGroup: userAgeGroup,
        packId: oclmPack.id,
        title: oclmPack.title,
        bibleReadingRange:
          (oclmPack.bibleReadingRange as { reference: string } | null) ?? null,
        bibleReadingAssignment:
          (oclmPack.bibleReadingAssignment as { reference: string } | null) ??
          null,
        songs: Array.isArray(oclmPack.songs)
          ? (oclmPack.songs as unknown as number[])
          : [],
        sections: Array.isArray(oclmPack.sections)
          ? (oclmPack.sections as unknown as WorkbookSection[])
          : [],
        vocabulary: Array.isArray(oclmPack.vocabulary)
          ? (oclmPack.vocabulary as unknown as string[])
          : [],
        attribution: oclmPack.attribution ?? null,
        sourceUrl: oclmPack.sourceUrl ?? null,
      }
    : null;

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
        study={study}
        workbook={workbook}
      />
    </div>
  );
}
