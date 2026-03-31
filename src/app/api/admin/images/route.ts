import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "svg"];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const VALID_CATEGORIES = [
  "SCENE",
  "CHARACTER",
  "ILLUSTRATION",
  "OUTLINE",
  "PHOTO",
] as const;

const VALID_AGE_GROUPS = [
  "LITTLE_ONES",
  "YOUTH",
  "ADULT",
  "FAMILY",
] as const;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const images = await prisma.imageAsset.findMany({
    where: category
      ? { category: category as (typeof VALID_CATEGORIES)[number] }
      : undefined,
    include: {
      contentPack: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(images);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();

  // Extract fields
  const file = formData.get("file") as File | null;
  const category = formData.get("category") as string | null;
  const ageGroup = (formData.get("ageGroup") as string) || "FAMILY";
  const altText = (formData.get("altText") as string) || "";
  const tagsRaw = formData.get("tags") as string | null;
  const contentPackId = formData.get("contentPackId") as string | null;

  // Validate required fields
  if (!file) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  if (!category || !VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
    return NextResponse.json(
      { error: `Category is required and must be one of: ${VALID_CATEGORIES.join(", ")}` },
      { status: 400 }
    );
  }

  if (!VALID_AGE_GROUPS.includes(ageGroup as (typeof VALID_AGE_GROUPS)[number])) {
    return NextResponse.json(
      { error: `ageGroup must be one of: ${VALID_AGE_GROUPS.join(", ")}` },
      { status: 400 }
    );
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}` },
      { status: 400 }
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File size exceeds 10MB limit" },
      { status: 400 }
    );
  }

  // Validate extension
  const originalName = file.name;
  const ext = originalName.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json(
      { error: `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}` },
      { status: 400 }
    );
  }

  // Parse tags
  const tags: string[] = tagsRaw
    ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  // Generate unique filename
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const relativePath = `uploads/${uniqueName}`;
  const absolutePath = path.join(process.cwd(), "public", relativePath);

  // Write file to disk
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(absolutePath, buffer);

  // Create database record
  const imageAsset = await prisma.imageAsset.create({
    data: {
      filename: originalName,
      path: relativePath,
      altText,
      category: category as (typeof VALID_CATEGORIES)[number],
      ageGroup: ageGroup as (typeof VALID_AGE_GROUPS)[number],
      tags: JSON.parse(JSON.stringify(tags)),
      contentPackId: contentPackId || null,
    },
  });

  return NextResponse.json(imageAsset, { status: 201 });
}
