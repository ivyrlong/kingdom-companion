/**
 * One-time ingest: populate the BibleVerse table with the NWT (English)
 * study edition from wol.jw.org. Idempotent + resumable — rerun any
 * time and it only fetches chapters that aren't fully stored yet.
 *
 * Run:
 *   npx tsx prisma/ingest-nwt-bible.ts            # all 66 books
 *   BOOK=43 npx tsx prisma/ingest-nwt-bible.ts    # just John
 *   BOOK=43 CHAPTER=3 npx tsx prisma/ingest-nwt-bible.ts
 *   DELAY_MS=2000 npx tsx prisma/ingest-nwt-bible.ts   # slow down
 *
 * At the default 1.2s between requests, a full run covers ~1189
 * chapters in roughly 25 minutes. The script writes a quick [book/
 * chapter] log line for each hit; failed chapters are reported but
 * never abort the run.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import {
  fetchNwtChapter,
  NWT_CHAPTER_COUNTS,
} from "../src/lib/bible-verses";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const DELAY_MS = Number.parseInt(process.env.DELAY_MS ?? "", 10) || 1200;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function ingestChapter(
  bookNumber: number,
  chapter: number,
): Promise<{ written: number; skipped: boolean }> {
  const existing = await prisma.bibleVerse.count({
    where: { translation: "NWT", bookNumber, chapter },
  });
  if (existing > 0) {
    return { written: 0, skipped: true };
  }
  const verses = await fetchNwtChapter(bookNumber, chapter);
  if (verses.length === 0) {
    throw new Error("parser returned zero verses");
  }
  await prisma.bibleVerse.createMany({
    data: verses.map((v) => ({
      translation: "NWT",
      bookNumber,
      chapter,
      verse: v.verse,
      text: v.text,
    })),
    skipDuplicates: true,
  });
  return { written: verses.length, skipped: false };
}

async function main() {
  const argBook = Number.parseInt(process.env.BOOK ?? "", 10);
  const argChapter = Number.parseInt(process.env.CHAPTER ?? "", 10);

  const bookNumbers = Number.isFinite(argBook)
    ? [argBook]
    : Array.from({ length: 66 }, (_, i) => i + 1);

  let totalWritten = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const book of bookNumbers) {
    const chapterCount = NWT_CHAPTER_COUNTS[book];
    if (!chapterCount) {
      console.warn(`! unknown book number ${book}`);
      continue;
    }
    const chapterList = Number.isFinite(argChapter)
      ? [argChapter]
      : Array.from({ length: chapterCount }, (_, i) => i + 1);

    console.log(`\n[book ${book}] ${chapterList.length} chapter(s)`);
    for (const ch of chapterList) {
      try {
        const { written, skipped } = await ingestChapter(book, ch);
        if (skipped) {
          totalSkipped++;
          process.stdout.write(`  ${book}/${ch} skip\n`);
        } else {
          totalWritten += written;
          process.stdout.write(`  ${book}/${ch} ${written} verses\n`);
          await sleep(DELAY_MS);
        }
      } catch (e) {
        totalFailed++;
        process.stdout.write(
          `  ${book}/${ch} FAIL ${(e as Error).message}\n`,
        );
        // Longer pause after a failure in case we hit a rate limit.
        await sleep(DELAY_MS * 2);
      }
    }
  }

  console.log(
    `\nDone. ${totalWritten} verses written, ${totalSkipped} chapters already present, ${totalFailed} failed.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
