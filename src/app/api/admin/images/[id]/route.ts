import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { unlink } from "fs/promises";
import path from "path";
import { z } from "zod";

const VALID_CATEGORIES = [
  "SCENE",
  "CHARACTER",
  "ILLUSTRATION",
  "OUTLINE",
  "PHOTO",
  "COLORING_SVG",
  "COLORING_OUTLINE",
] as const;

const VALID_AGE_GROUPS = ["LITTLE_ONES", "YOUTH", "ADULT", "FAMILY"] as const;

const updateSchema = z.object({
  categories: z.array(z.enum(VALID_CATEGORIES)).min(1).optional(),
  ageGroup: z.enum(VALID_AGE_GROUPS).optional(),
  altText: z.string().optional(),
  tags: z.array(z.string()).optional(),
  contentPackId: z.string().nullable().optional(),
});

async function authorize() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return null;
  }
  return session;
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

  // Deduplicate categories if provided
  const data = { ...parsed.data };
  if (data.categories) {
    data.categories = Array.from(new Set(data.categories));
  }

  try {
    const updated = await prisma.imageAsset.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2025") {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
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

  // Find the image asset
  const asset = await prisma.imageAsset.findUnique({ where: { id } });
  if (!asset) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  // Delete the file from the filesystem
  const absolutePath = path.join(process.cwd(), "public", asset.path);
  try {
    await unlink(absolutePath);
  } catch (err) {
    // File may already be missing; log but don't fail the request
    console.warn(`Could not delete file at ${absolutePath}:`, err);
  }

  // Delete the database record
  await prisma.imageAsset.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
