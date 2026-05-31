import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const rows = await prisma.gameInstance.findMany({
  where: {
    game: {
      slug: { in: ["quiet-listeners", "meeting-bingo", "tap-when-you-hear"] },
    },
  },
  include: {
    game: { select: { slug: true } },
    contentPack: { select: { title: true } },
  },
  orderBy: { createdAt: "desc" },
});
for (const r of rows) {
  console.log(
    `${r.game.slug.padEnd(20)} ${r.context.padEnd(13)} ${r.contentPack?.title ?? r.title}`,
  );
}
console.log(`\n${rows.length} instance(s)`);
await prisma.$disconnect();
