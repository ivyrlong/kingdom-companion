import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/encyclopedia
 * Returns the active entries for the current user's age group, plus the IDs they've collected.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const userAgeGroup =
    (session.user as { ageGroup?: string }).ageGroup || "FAMILY";

  // For now we serve LITTLE_ONES entries to LITTLE_ONES users only.
  // FAMILY accounts also see them so siblings can collaborate.
  const showEntries = userAgeGroup === "LITTLE_ONES" || userAgeGroup === "FAMILY";

  if (!showEntries) {
    return NextResponse.json({ entries: [], collected: [] });
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

  return NextResponse.json({ entries, collected: collections });
}
