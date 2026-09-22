/**
 * Seed the Character catalog from the source of truth: prompts/characters.md.
 *
 * Idempotent — safe to re-run any time the bible changes; upserts by slug.
 * The bible file is human-authored; this parser is intentionally forgiving of
 * whitespace but strict about section shape so accidental format drift shows
 * up loudly rather than as silent data-loss.
 *
 * Run:   npx tsx prisma/seed-characters.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync } from "node:fs";
import path from "node:path";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface Parsed {
  slug: string;
  name: string;
  familyName: string | null;
  role: string;
  variant: string;
  identityPrompt: string;
}

/** "Grace Miller" → "grace-miller". Lower + hyphenate + strip odd chars. */
function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** "teen girl" → "teen-girl", "grandmother" → "grandmother". */
function normaliseRole(role: string): string {
  return role.trim().toLowerCase().replace(/\s+/g, "-");
}

/** Pull `variant` from a filename like `sticker-people-blonde-grandmother.png`. */
function variantFromFilename(filename: string): string | null {
  const m = filename.match(/^sticker-people-([a-z]+)-/i);
  return m ? m[1].toLowerCase() : null;
}

function parseBible(md: string): Parsed[] {
  const parsed: Parsed[] = [];

  // Split into family sections. A family header looks like:
  //   # The Millers — blonde family
  // Anything before the first family header (intro prose) is ignored.
  const familyBlocks = md.split(/^# The /m).slice(1);

  for (const rawBlock of familyBlocks) {
    // First line is the header remainder ("Millers — blonde family").
    // Body is everything after that first line up to the next section.
    const [header, ...bodyLines] = rawBlock.split("\n");
    // Only match section headers — skip everything else (like "# Later, once the
    // app uses characters programmatically"). We don't rely on this for the
    // family name; that comes from each character's own last-name below (so
    // "The Reyes" doesn't get de-pluralised to "Reye").
    if (!/^[A-Za-z]+s?\s*[—-]\s*[a-z-]+\s+family/i.test(header)) continue;

    const body = bodyLines.join("\n");

    // Each character = "### Name Family (role)" followed by bullets.
    const charBlocks = body.split(/^### /m).slice(1);
    for (const cb of charBlocks) {
      // "Grace Miller (grandmother)\n- Filename: `sticker-people-blonde-grandmother.png`\n- Frozen identity: `Grace, ...`"
      const nameLine = cb.split("\n")[0].trim();
      const nameMatch = nameLine.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
      if (!nameMatch) {
        console.warn(`  ⚠ Skipping malformed character header: "${nameLine}"`);
        continue;
      }
      const name = nameMatch[1].trim();
      const role = normaliseRole(nameMatch[2]);

      const filenameMatch = cb.match(/-\s*Filename:\s*`([^`]+)`/);
      const identityMatch = cb.match(/-\s*Frozen identity:\s*`([^`]+)`/);
      if (!filenameMatch || !identityMatch) {
        console.warn(`  ⚠ Skipping ${name}: missing Filename or Frozen identity`);
        continue;
      }

      const variant = variantFromFilename(filenameMatch[1]);
      if (!variant) {
        console.warn(`  ⚠ Skipping ${name}: cannot parse variant from ${filenameMatch[1]}`);
        continue;
      }

      // Family = the last space-separated token of the character's name.
      // "Grace Miller" → "Miller"; "Sofia Reyes" → "Reyes"; single-word
      // names would produce familyName = null (no such cases today).
      const parts = name.split(/\s+/);
      const familyName = parts.length > 1 ? parts[parts.length - 1] : null;

      parsed.push({
        slug: slugify(name),
        name,
        familyName,
        role,
        variant,
        identityPrompt: identityMatch[1].trim(),
      });
    }
  }

  return parsed;
}

async function main() {
  const bibleFile = path.join(process.cwd(), "prompts", "characters.md");
  const md = readFileSync(bibleFile, "utf8");
  const characters = parseBible(md);

  console.log(`Parsed ${characters.length} characters from characters.md`);

  let created = 0;
  let updated = 0;
  for (const c of characters) {
    const existing = await prisma.character.findUnique({ where: { slug: c.slug } });
    await prisma.character.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        familyName: c.familyName,
        role: c.role,
        variant: c.variant,
        identityPrompt: c.identityPrompt,
      },
      create: c,
    });
    if (existing) {
      updated++;
    } else {
      created++;
      console.log(`  + ${c.name} (${c.variant} ${c.role}, ${c.familyName ?? "no family"})`);
    }
  }

  console.log(`\nDone. ${created} created, ${updated} updated. Total in DB: ${characters.length}.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
