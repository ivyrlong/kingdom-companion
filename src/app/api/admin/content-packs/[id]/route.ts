import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { questionSchema, oclmSectionSchema } from "../_schemas";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  source: z
    .enum(["WATCHTOWER", "OCLM", "EVERGREEN", "DAILY_TEXT"])
    .optional(),
  context: z.enum(["EVERGREEN", "MEETING_PREP", "MEETING_LIVE", "DAILY"]).optional(),
  vocabulary: z.array(z.string()).optional(),
  scriptures: z
    .array(z.object({ reference: z.string(), text: z.string().default("") }))
    .optional(),
  keyPeople: z.array(z.string()).optional(),
  themes: z.array(z.string()).optional(),
  questions: z.array(questionSchema).optional(),
  keyPhrases: z.array(z.string()).optional(),
  comment: z.string().nullable().optional(),
  simplifiedComment: z.string().nullable().optional(),
  // WOL metadata — same fields admins can set on create. JSON columns
  // (themeScripture) can't carry a JS `null` through Prisma's typed
  // update input, so they're optional-only.
  issueLabel: z.string().nullable().optional(),
  articleNumber: z.number().int().nullable().optional(),
  themeScripture: z.object({ reference: z.string() }).optional(),
  sourceUrl: z.string().nullable().optional(),
  sourceDocId: z.string().nullable().optional(),
  attribution: z.string().nullable().optional(),
  // OCLM workbook metadata. JSON columns (bibleReadingRange,
  // bibleReadingAssignment, songs, sections) are optional-only for
  // the same reason as themeScripture.
  publicationCode: z.string().nullable().optional(),
  bibleReadingRange: z.object({ reference: z.string() }).optional(),
  bibleReadingAssignment: z.object({ reference: z.string() }).optional(),
  songs: z.array(z.number().int()).optional(),
  sections: z.array(oclmSectionSchema).optional(),
});

async function authorize() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return null;
  }
  return session;
}

/* ── GET single pack ──────────────────────────────────────────────── */

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await authorize();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const pack = await prisma.contentPack.findUnique({
    where: { id },
    include: {
      meetingWeek: true,
      instances: { include: { game: true } },
      images: true,
    },
  });

  if (!pack) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(pack);
}

/* ── PATCH — update content pack ──────────────────────────────────── */

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
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
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.contentPack.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw e;
  }
}

/* ── DELETE — remove content pack and its game instances ───────────── */

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await authorize();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify the pack exists first so we can return a clean 404 without
  // needing to interpret a Prisma error code. The $transaction below
  // would surface FK / constraint errors that are NOT P2025 — by
  // splitting the existence check out we can give the UI a real reason.
  const existing = await prisma.contentPack.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await prisma.$transaction([
      prisma.gameInstance.deleteMany({ where: { contentPackId: id } }),
      prisma.contentPack.delete({ where: { id } }),
    ]);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg =
      e instanceof Error ? e.message : typeof e === "string" ? e : String(e);
    const code =
      e && typeof e === "object" && "code" in e ? String(e.code) : undefined;
    console.error("[content-packs DELETE] failed:", { id, code, msg });
    return NextResponse.json(
      { error: "Failed to delete", code, message: msg },
      { status: 500 },
    );
  }
}
