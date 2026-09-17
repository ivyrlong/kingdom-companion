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

const updateSchema = z.object({
  slug: z.string().min(1).max(80).optional(),
  term: z.string().min(1).max(120).optional(),
  definition: z.string().min(1).max(500).optional(),
  imageUrl: z.string().nullable().optional(),
  bibleRef: z.string().nullable().optional(),
  category: z.enum(VALID_CATEGORIES).optional(),
  triggers: z.array(z.string()).optional(),
  ageGroup: z.enum(VALID_AGE_GROUPS).optional(),
  isActive: z.boolean().optional(),
  // Rich fields — nullable so form can explicitly clear.
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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await authorize();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const entry = await prisma.encyclopediaEntry.findUnique({ where: { id } });
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(entry);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await authorize();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { timeline, contentByTier, stickerId, ...rest } = parsed.data;
  const data: Prisma.EncyclopediaEntryUpdateInput = { ...rest };
  if (data.slug && typeof data.slug === "string") {
    data.slug = data.slug.toLowerCase().trim().replace(/\s+/g, "-");
  }
  if (rest.triggers) {
    data.triggers = rest.triggers.map((t) => t.toLowerCase().trim()).filter(Boolean);
  }
  // Nullable JSON columns need Prisma.DbNull (SQL NULL) instead of JS
  // null. Undefined means "don't touch this column" — the form leaves
  // it out when the user is only editing basic fields.
  if (timeline !== undefined) {
    data.timeline = timeline === null ? Prisma.DbNull : timeline;
  }
  if (contentByTier !== undefined) {
    data.contentByTier = contentByTier === null ? Prisma.DbNull : contentByTier;
  }
  // Sticker link: connect if a string, disconnect if explicit null,
  // untouched if undefined.
  if (stickerId !== undefined) {
    if (stickerId === null || stickerId === "") {
      data.sticker = { disconnect: true };
    } else {
      // Confirm the sticker exists so we don't create a dangling FK error.
      const sticker = await prisma.sticker.findUnique({
        where: { id: stickerId },
        select: { id: true },
      });
      if (!sticker) {
        return NextResponse.json(
          { error: `Sticker not found: ${stickerId}` },
          { status: 400 },
        );
      }
      data.sticker = { connect: { id: sticker.id } };
    }
  }

  try {
    const updated = await prisma.encyclopediaEntry.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e) {
      if (e.code === "P2025") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (e.code === "P2002") {
        return NextResponse.json(
          { error: "Slug already in use." },
          { status: 409 }
        );
      }
    }
    throw e;
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await authorize();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    await prisma.encyclopediaEntry.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw e;
  }
}
