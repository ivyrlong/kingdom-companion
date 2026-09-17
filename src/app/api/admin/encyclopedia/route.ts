import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const VALID_CATEGORIES = ["PEOPLE", "PLACES", "THINGS", "EVENTS"] as const;
const VALID_AGE_GROUPS = ["LITTLE_ONES", "YOUTH", "ADULT", "FAMILY"] as const;

const timelineItemSchema = z.object({
  when: z.string(),
  event: z.string(),
});
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

const createSchema = z.object({
  slug: z.string().min(1).max(80),
  term: z.string().min(1).max(120),
  definition: z.string().min(1).max(500),
  imageUrl: z.string().nullable().optional(),
  bibleRef: z.string().nullable().optional(),
  category: z.enum(VALID_CATEGORIES).default("THINGS"),
  triggers: z.array(z.string()).default([]),
  ageGroup: z.enum(VALID_AGE_GROUPS).default("LITTLE_ONES"),
  isActive: z.boolean().default(true),
  era: z.string().nullable().optional(),
  timeline: z.array(timelineItemSchema).nullable().optional(),
  locations: z.array(z.string()).optional(),
  contentByTier: contentByTierSchema.nullable().optional(),
  stickerId: z.string().nullable().optional(),
});

async function authorize() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await authorize();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await prisma.encyclopediaEntry.findMany({
    orderBy: { term: "asc" },
  });

  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  const session = await authorize();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    timeline,
    contentByTier,
    stickerId,
    ...rest
  } = parsed.data;
  // Normalize slug and triggers to lowercase
  const slug = rest.slug.toLowerCase().trim().replace(/\s+/g, "-");
  const triggers = rest.triggers.map((t) => t.toLowerCase().trim()).filter(Boolean);

  // Optional sticker link — validate FK exists so we don't 500.
  if (stickerId) {
    const exists = await prisma.sticker.findUnique({
      where: { id: stickerId },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json(
        { error: `Sticker not found: ${stickerId}` },
        { status: 400 },
      );
    }
  }

  try {
    const created = await prisma.encyclopediaEntry.create({
      data: {
        ...rest,
        slug,
        triggers,
        // Prisma requires DbNull for nullable JSON columns instead of JS null.
        timeline: timeline ?? Prisma.DbNull,
        contentByTier: contentByTier ?? Prisma.DbNull,
        stickerId: stickerId || null,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      return NextResponse.json(
        { error: `An entry with slug "${slug}" already exists.` },
        { status: 409 }
      );
    }
    throw e;
  }
}
