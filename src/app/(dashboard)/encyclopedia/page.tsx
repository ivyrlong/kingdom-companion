export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import EncyclopediaBook from "@/components/encyclopedia/EncyclopediaBook";

export const metadata = { title: "My Encyclopedia | Kingdom Companion" };

export default async function EncyclopediaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const userAgeGroup =
    (session.user as { ageGroup?: string }).ageGroup || "FAMILY";

  const showBook = userAgeGroup === "LITTLE_ONES" || userAgeGroup === "FAMILY";

  if (!showBook) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-3">
          My Encyclopedia
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          The encyclopedia is for our youngest readers. Switch to a Little Ones or
          Family profile to start collecting!
        </p>
      </div>
    );
  }

  const [entries, collections] = await Promise.all([
    prisma.encyclopediaEntry.findMany({
      where: { isActive: true, ageGroup: { in: ["LITTLE_ONES", "FAMILY"] } },
      orderBy: { term: "asc" },
    }),
    prisma.userEncyclopediaCollection.findMany({
      where: { userId },
      select: { entryId: true, collectedAt: true, source: true },
    }),
  ]);

  const collectedMap = new Map(
    collections.map((c) => [c.entryId, c.collectedAt.toISOString()]),
  );

  const items = entries.map((e) => ({
    id: e.id,
    slug: e.slug,
    term: e.term,
    definition: e.definition,
    imageUrl: e.imageUrl,
    bibleRef: e.bibleRef,
    category: e.category as "PEOPLE" | "PLACES" | "THINGS" | "EVENTS",
    collectedAt: collectedMap.get(e.id) ?? null,
  }));

  return <EncyclopediaBook items={items} />;
}
