import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const VALID_CATEGORIES = ["PEOPLE", "PLACES", "THINGS", "EVENTS"] as const;
const VALID_AGE_GROUPS = ["LITTLE_ONES", "YOUTH", "ADULT", "FAMILY"] as const;

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

  const data = { ...parsed.data };
  if (data.slug) {
    data.slug = data.slug.toLowerCase().trim().replace(/\s+/g, "-");
  }
  if (data.triggers) {
    data.triggers = data.triggers.map((t) => t.toLowerCase().trim()).filter(Boolean);
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
