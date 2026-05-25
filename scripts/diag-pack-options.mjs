/**
 * Read-only: dump each question's options + answer for a pack so we can
 * see why MC is rendering more buttons than expected.
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
});
if (!pack) { console.error("no pack"); process.exit(1); }

console.log(`Pack: ${pack.title}\n`);
const qs = Array.isArray(pack.questions) ? pack.questions : [];
for (let i = 0; i < qs.length; i++) {
  const q = qs[i];
  const opts = q?.options ?? [];
  if (!opts.length) continue;
  console.log(`[Q${i}] ${q.question.slice(0,70)}`);
  console.log(`  answer: ${(q.answer ?? "").slice(0,80)}`);
  console.log(`  options (${opts.length}):`);
  for (let j = 0; j < opts.length; j++) console.log(`    ${j+1}. ${opts[j]}`);
  console.log();
}
await prisma.$disconnect();
