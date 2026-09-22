import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { z } from "zod";

/**
 * POST /api/admin/encyclopedia/import
 *
 * Bulk-ingest encyclopedia entries from JSON. Accepts either:
 *   - The simple shape ({ slug, term, definition, ... }) matching the
 *     existing /api/admin/encyclopedia POST body, or
 *   - The rich Bible-character shape ({ slug, name, era, timeline,
 *     locations, content: { littleOnes, youth, adult }, category, ... })
 *
 * The two shapes are normalised into a single upsert per slug. On save,
 * we auto-link to a Sticker whose slug matches — a paired
 * `sticker-bible-<slug>.png` upload becomes the entry's portrait and
 * collectable art without any manual linking step.
 *
 * Body:
 *   { "entries": [ ... ] }
 * or
 *   [ ... ]
 * or one entry object.
 *
 * Returns { created, updated, skipped, unlinked, errors }.
 */

const VALID_CATEGORIES = ["PEOPLE", "PLACES", "THINGS", "EVENTS"] as const;
const VALID_AGE_GROUPS = ["LITTLE_ONES", "YOUTH", "ADULT", "FAMILY"] as const;

// Rich Bible-character-style tier content. All optional so simpler
// entries pass through validation unchanged.
const triviaItemSchema = z.object({
  question: z.string(),
  answer: z.string(),
  bibleRef: z.string().optional(),
  source: z.enum(["rewritten", "derived"]).optional(),
});

const tierSchema = z
  .object({
    shortDescription: z.string().max(500).optional(),
    longBlurb: z.string().max(2000).optional(),
    trivia: z.array(triviaItemSchema).optional(),
    cluesHardToEasy: z.array(z.string()).max(10).optional(),
  })
  .strict();

const contentByTierSchema = z
  .object({
    littleOnes: tierSchema.optional(),
    youth: tierSchema.optional(),
    adult: tierSchema.optional(),
  })
  .strict();

const timelineItemSchema = z.object({
  when: z.string(),
  event: z.string(),
});

// The unified input shape. Every field the existing model has, plus
// the rich additions. Loose here so both simple and rich payloads pass;
// downstream normalisation fills in what's missing.
const inputEntrySchema = z
  .object({
    slug: z.string().min(1).max(120),
    // simple shape uses `term`; rich shape uses `name` — accept either
    term: z.string().min(1).max(200).optional(),
    name: z.string().min(1).max(200).optional(),
    definition: z.string().max(2000).optional(),
    imageUrl: z.string().nullable().optional(),
    bibleRef: z.string().nullable().optional(),
    category: z.enum(VALID_CATEGORIES).default("THINGS"),
    triggers: z.array(z.string()).default([]),
    ageGroup: z.enum(VALID_AGE_GROUPS).default("LITTLE_ONES"),
    isActive: z.boolean().default(true),
    // rich fields
    era: z.string().optional(),
    timeline: z.array(timelineItemSchema).optional(),
    locations: z.array(z.string()).optional(),
    content: contentByTierSchema.optional(),
  })
  .refine((v) => v.term || v.name, {
    message: "either `term` or `name` is required",
  });

const bodySchema = z.union([
  z.object({ entries: z.array(inputEntrySchema) }),
  z.array(inputEntrySchema),
  inputEntrySchema,
]);

interface ImportResult {
  slug: string;
  status: "created" | "updated" | "skipped" | "error";
  linkedStickerSlug?: string;
  message?: string;
}

async function requireAdmin() {
  const session = await auth();
  return (
    !!session?.user &&
    (session.user as { role?: string }).role === "ADMIN"
  );
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const entries = Array.isArray(parsed.data)
    ? parsed.data
    : "entries" in parsed.data
      ? parsed.data.entries
      : [parsed.data];

  const results: ImportResult[] = [];
  let created = 0;
  let updated = 0;
  let unlinked = 0;

  for (const raw of entries) {
    const displayName = raw.name ?? raw.term ?? raw.slug;
    // Derive a fallback definition from the adult short description if the
    // simple `definition` field wasn't supplied. Something has to fill the
    // NOT-NULL column; rich entries always have this via content.adult.
    const fallbackDef =
      raw.content?.adult?.shortDescription ??
      raw.content?.youth?.shortDescription ??
      raw.content?.littleOnes?.shortDescription ??
      "";
    const definition = (raw.definition ?? fallbackDef).slice(0, 500);
    if (!definition) {
      results.push({
        slug: raw.slug,
        status: "error",
        message:
          "no definition and no content tier with shortDescription — nothing to store",
      });
      continue;
    }

    // Look for a Sticker whose slug matches — that becomes the portrait
    // and collectable art. Missing sticker is fine; entry still saves.
    const sticker = await prisma.sticker.findUnique({
      where: { slug: raw.slug },
      select: { id: true, slug: true },
    });

    try {
      const existing = await prisma.encyclopediaEntry.findUnique({
        where: { slug: raw.slug },
        select: { id: true },
      });

      // Prisma requires DbNull (SQL NULL) rather than JS null for
      // nullable JSON columns. Every non-JSON nullable field takes
      // regular null just fine.
      const data = {
        term: displayName,
        definition,
        imageUrl: raw.imageUrl ?? null,
        bibleRef: raw.bibleRef ?? null,
        category: raw.category,
        triggers: raw.triggers,
        ageGroup: raw.ageGroup,
        isActive: raw.isActive,
        era: raw.era ?? null,
        timeline: raw.timeline ?? Prisma.DbNull,
        locations: raw.locations ?? [],
        contentByTier: raw.content ?? Prisma.DbNull,
        stickerId: sticker?.id ?? null,
      };

      if (existing) {
        await prisma.encyclopediaEntry.update({
          where: { slug: raw.slug },
          data,
        });
        updated++;
        results.push({
          slug: raw.slug,
          status: "updated",
          linkedStickerSlug: sticker?.slug,
        });
      } else {
        await prisma.encyclopediaEntry.create({
          data: { slug: raw.slug, ...data },
        });
        created++;
        results.push({
          slug: raw.slug,
          status: "created",
          linkedStickerSlug: sticker?.slug,
        });
      }
      if (!sticker) unlinked++;
    } catch (e) {
      results.push({
        slug: raw.slug,
        status: "error",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({
    total: entries.length,
    created,
    updated,
    unlinked,
    errors: results.filter((r) => r.status === "error").length,
    results,
  });
}
