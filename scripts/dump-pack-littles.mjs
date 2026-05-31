/**
 * Read-only: dump every question + its Little Ones (simplified) answer
 * for a content pack, so we can write image prompts from them.
 * Usage: node --env-file=.env scripts/dump-pack-littles.mjs "<title fragment>"
 *   e.g.  node --env-file=.env scripts/dump-pack-littles.mjs Insight
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const fragment = process.argv[2] ?? "Insight";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const pack = await prisma.contentPack.findFirst({
  where: { source: "WATCHTOWER", title: { contains: fragment, mode: "insensitive" } },
  orderBy: { createdAt: "desc" },
});

if (!pack) {
  console.error(`No WATCHTOWER pack matching '${fragment}'`);
  process.exit(1);
}

console.log(`Pack: ${pack.title}\n`);

const qs = Array.isArray(pack.questions) ? pack.questions : [];
let n = 0;
for (let i = 0; i < qs.length; i++) {
  const q = qs[i];
  const simplified = (q?.simplifiedAnswer ?? "").trim();
  if (!simplified) continue; // Little Ones only see questions with a simplified answer
  n++;
  console.log(`[${n}] (idx ${i}) Q: ${q.question}`);
  console.log(`    A: ${simplified}\n`);
}
console.log(`${n} Little Ones question(s) total`);

await prisma.$disconnect();
