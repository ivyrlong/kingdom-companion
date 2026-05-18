import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

// One-time: existing Daily Text packs stored the comment only inside
// sourceText ("ref\n\ntext\n\ncomment"). Populate the new `comment` column
// from it. Idempotent — only touches DAILY_TEXT packs whose comment is null.
async function main() {
  const packs = await prisma.contentPack.findMany({
    where: { source: "DAILY_TEXT", comment: null },
    select: { id: true, sourceText: true },
  });

  console.log(`Backfilling ${packs.length} daily pack(s)...`);
  let updated = 0;

  for (const p of packs) {
    if (!p.sourceText) continue;
    const parts = p.sourceText.split("\n\n");
    if (parts.length < 3) continue;
    const comment = parts.slice(2).join("\n\n").trim();
    if (!comment) continue;
    await prisma.contentPack.update({
      where: { id: p.id },
      data: { comment },
    });
    updated++;
  }

  console.log(`Done. Updated ${updated} pack(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
