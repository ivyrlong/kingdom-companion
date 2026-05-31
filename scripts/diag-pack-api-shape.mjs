/**
 * Reproduce the exact Prisma query the GET /api/admin/content-packs/[id]
 * endpoint runs, and print the `images` field of the result. If this shows
 * 18 images, the API is fine and the bug is purely client-state. If this
 * shows 0, the bug is in the Prisma query or schema relation.
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
  include: { meetingWeek: true, instances: { include: { game: true } }, images: true },
});

if (!pack) {
  console.log("No pack found");
  process.exit(1);
}

console.log(`Pack: ${pack.title}`);
console.log(`pack.images type: ${Array.isArray(pack.images) ? "array" : typeof pack.images}`);
console.log(`pack.images length: ${pack.images?.length ?? "undefined"}`);
console.log(`First 3:`);
for (const img of (pack.images ?? []).slice(0, 3)) {
  console.log(`  - ${JSON.stringify({ id: img.id, filename: img.filename, path: img.path, altText: img.altText })}`);
}

await prisma.$disconnect();
