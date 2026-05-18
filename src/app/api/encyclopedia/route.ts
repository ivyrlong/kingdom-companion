import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getEncyclopediaCapabilities,
  curatedAgeFilter,
} from "@/lib/encyclopedia";

/**
 * GET /api/encyclopedia
 * Curated entries the current user should receive (per their capabilities),
 * plus the IDs they've collected. Returns empty when the user doesn't receive
 * curated findings (e.g. an Adult who hasn't opted in).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ageGroup: true,
      profile: {
        select: { encyclopediaMode: true, receiveCuratedFindings: true },
      },
    },
  });

  const caps = getEncyclopediaCapabilities(
    user?.ageGroup,
    user?.profile ?? undefined,
  );

  if (!caps.enabled || !caps.receivesCurated) {
    return NextResponse.json({ entries: [], collected: [] });
  }

  const [entries, collections] = await Promise.all([
    prisma.encyclopediaEntry.findMany({
      where: {
        isActive: true,
        ageGroup: { in: curatedAgeFilter(user?.ageGroup) as never },
      },
      orderBy: { term: "asc" },
    }),
    prisma.userEncyclopediaCollection.findMany({
      where: { userId },
      select: { entryId: true, collectedAt: true, source: true },
    }),
  ]);

  return NextResponse.json({ entries, collected: collections });
}
