/**
 * Diagnostic: list every ImageAsset row, grouped by which content pack
 * they're linked to. Helps answer "why isn't this image showing in the
 * pack's picture dropdown?" — almost always because contentPackId is
 * null on the asset.
 *
 * Usage: node --env-file=.env scripts/diag-pack-images.mjs [titleFragment]
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const titleFragment = process.argv[2] ?? "";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Show all packs and how many images each owns.
const packs = await prisma.contentPack.findMany({
  where: titleFragment
    ? { title: { contains: titleFragment, mode: "insensitive" } }
    : undefined,
  include: {
    images: { select: { id: true, filename: true, categories: true, ageGroup: true, createdAt: true } },
  },
  orderBy: { createdAt: "desc" },
});

console.log(`\n=== Packs ===`);
for (const p of packs) {
  console.log(
    `\n[${p.id.slice(0, 8)}] ${p.title}  (source=${p.source}, ${p.images.length} linked image(s))`,
  );
  for (const img of p.images) {
    console.log(
      `   - ${img.filename.padEnd(40)} [${img.categories.join(",")}/${img.ageGroup}]`,
    );
  }
}

// And images that are NOT linked to any pack — the likely "I thought
// I linked them but didn't" case.
const orphans = await prisma.imageAsset.findMany({
  where: { contentPackId: null },
  orderBy: { createdAt: "desc" },
  take: 50,
  select: { id: true, filename: true, categories: true, ageGroup: true, createdAt: true },
});
console.log(`\n=== Unlinked images (contentPackId is null) ===`);
console.log(`${orphans.length} orphan image(s)`);
for (const img of orphans) {
  console.log(
    `   - ${img.filename.padEnd(40)} [${img.categories.join(",")}/${img.ageGroup}]  ${img.createdAt.toISOString()}`,
  );
}

await prisma.$disconnect();
