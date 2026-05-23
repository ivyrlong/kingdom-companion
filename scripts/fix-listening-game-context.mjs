/**
 * One-shot backfill: listening games (Quiet Listeners, Meeting Bingo,
 * Tap When You Hear) were created with the pack's context (typically
 * MEETING_PREP) before commit X. Force them to MEETING_LIVE — that is
 * the only correct value for these games, since the listening activity
 * happens during the meeting itself.
 *
 * Safe to re-run; the WHERE clause skips already-correct rows.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const result = await prisma.gameInstance.updateMany({
  where: {
    context: { not: "MEETING_LIVE" },
    game: {
      slug: { in: ["quiet-listeners", "meeting-bingo", "tap-when-you-hear"] },
    },
  },
  data: { context: "MEETING_LIVE" },
});

console.log(`Updated ${result.count} instance(s) → MEETING_LIVE`);
await prisma.$disconnect();
