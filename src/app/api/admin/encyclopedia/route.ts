import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const VALID_CATEGORIES = ["PEOPLE", "PLACES", "THINGS", "EVENTS"] as const;
const VALID_AGE_GROUPS = ["LITTLE_ONES", "YOUTH", "ADULT", "FAMILY"] as const;

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

  const data = parsed.data;
  // Normalize slug and triggers to lowercase
  const slug = data.slug.toLowerCase().trim().replace(/\s+/g, "-");
  const triggers = data.triggers.map((t) => t.toLowerCase().trim()).filter(Boolean);

  try {
    const created = await prisma.encyclopediaEntry.create({
      data: {
        ...data,
        slug,
        triggers,
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
