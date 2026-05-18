import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEncyclopediaCapabilities } from "@/lib/encyclopedia";
import { z } from "zod";

const CATEGORIES = ["PEOPLE", "PLACES", "THINGS", "EVENTS"] as const;

const createSchema = z.object({
  term: z.string().min(1).max(120),
  note: z.string().min(1).max(2000),
  category: z.enum(CATEGORIES).default("THINGS"),
  bibleRef: z.string().max(200).nullable().optional(),
  imageUrl: z.string().max(500).nullable().optional(),
});

async function authorizeAuthor() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ageGroup: true,
      profile: {
        select: { encyclopediaMode: true, receiveCuratedFindings: true },
      },
    },
  });
  if (!user) return null;

  const caps = getEncyclopediaCapabilities(user.ageGroup, user.profile);
  return caps.canAuthor ? userId : false;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const entries = await prisma.personalEntry.findMany({
    where: { userId: session.user.id },
    orderBy: { term: "asc" },
  });
  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  const author = await authorizeAuthor();
  if (author === null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (author === false) {
    return NextResponse.json(
      { error: "Your profile can't add personal entries." },
      { status: 403 },
    );
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const created = await prisma.personalEntry.create({
    data: {
      userId: author,
      term: d.term.trim(),
      note: d.note.trim(),
      category: d.category,
      bibleRef: d.bibleRef?.trim() || null,
      imageUrl: d.imageUrl?.trim() || null,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
