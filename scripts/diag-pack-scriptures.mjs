import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const pack = await prisma.contentPack.findFirst({ where: { title: { contains: "Insight", mode: "insensitive" } } });
console.log("Scriptures field type:", Array.isArray(pack.scriptures) ? "array" : typeof pack.scriptures);
console.log("Count:", pack.scriptures?.length ?? 0);
for (const s of (pack.scriptures ?? []).slice(0, 5)) {
  console.log(`  - ${s.reference}: ${(s.text ?? "(no text)").slice(0, 80)}`);
}
await prisma.$disconnect();
