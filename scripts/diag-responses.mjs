/**
 * Read-only: list every DailyResponse row for a given pack (and
 * optionally a user), with the response text + data JSON so we can tell
 * whether the save endpoint is persisting Watchtower study answers.
 *
 * Usage: node --env-file=.env scripts/diag-responses.mjs [packTitleFragment]
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const titleFragment = process.argv[2] ?? "Insight";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const pack = await prisma.contentPack.findFirst({
  where: { title: { contains: titleFragment, mode: "insensitive" } },
  select: { id: true, title: true },
});
if (!pack) {
  console.error(`No pack matching '${titleFragment}'`);
  process.exit(1);
}
console.log(`Pack: ${pack.title}\n`);

const rows = await prisma.dailyResponse.findMany({
  where: { contentPackId: pack.id },
  include: { user: { select: { email: true } } },
  orderBy: [{ userId: "asc" }, { questionIndex: "asc" }],
});

if (rows.length === 0) {
  console.log("(no DailyResponse rows for this pack)");
} else {
  for (const r of rows) {
    console.log(
      `[Q${r.questionIndex}] ${r.user?.email ?? r.userId}  resp="${(r.response ?? "").slice(0, 60)}"  data=${JSON.stringify(r.data)}`,
    );
  }
  console.log(`\n${rows.length} response row(s)`);
}

await prisma.$disconnect();
