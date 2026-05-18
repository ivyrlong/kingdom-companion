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
  "COLORING_SVG",
  "COLORING_OUTLINE",
] as const;

type ImageCategoryValue = (typeof VALID_CATEGORIES)[number];

const VALID_AGE_GROUPS = [
  "LITTLE_ONES",
  "YOUTH",
  "ADULT",
  "FAMILY",
] as const;

function parseCategoriesField(raw: FormDataEntryValue | null): ImageCategoryValue[] | null {
  if (raw == null) return null;
  const str = raw.toString().trim();
  if (!str) return [];

  // Try JSON first ("['SCENE','PHOTO']" or '["SCENE","PHOTO"]')
  let arr: unknown;
  try {
    arr = JSON.parse(str);
  } catch {
    // Fallback: comma-separated
    arr = str.split(",").map((s) => s.trim()).filter(Boolean);
  }

  if (!Array.isArray(arr)) return null;
  const result: ImageCategoryValue[] = [];
  for (const item of arr) {
    if (typeof item !== "string") return null;
    if (!VALID_CATEGORIES.includes(item as ImageCategoryValue)) return null;
    if (!result.includes(item as ImageCategoryValue)) {
      result.push(item as ImageCategoryValue);
    }
  }
  return result;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const packId = searchParams.get("packId");

  const where: {
    categories?: { has: ImageCategoryValue };
    contentPackId?: string;
  } = {};
  if (category && VALID_CATEGORIES.includes(category as ImageCategoryValue)) {
    where.categories = { has: category as ImageCategoryValue };
  }
  if (packId) {
    where.contentPackId = packId;
  }

  const images = await prisma.imageAsset.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
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
  const categoriesRaw = formData.get("categories");
  const legacyCategory = formData.get("category"); // backwards compat
  const ageGroup = (formData.get("ageGroup") as string) || "FAMILY";
  const altText = (formData.get("altText") as string) || "";
  const tagsRaw = formData.get("tags") as string | null;
  const contentPackId = formData.get("contentPackId") as string | null;

  // Validate required fields
  if (!file) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  // Resolve categories: prefer multi-value field, fall back to legacy single value
  let categories = parseCategoriesField(categoriesRaw);
  if (categories === null) {
    return NextResponse.json(
      { error: `Invalid categories. Each must be one of: ${VALID_CATEGORIES.join(", ")}` },
      { status: 400 }
    );
  }
  if (categories.length === 0 && typeof legacyCategory === "string") {
    if (!VALID_CATEGORIES.includes(legacyCategory as ImageCategoryValue)) {
      return NextResponse.json(
        { error: `category must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }
    categories = [legacyCategory as ImageCategoryValue];
  }
  if (categories.length === 0) {
    return NextResponse.json(
      { error: "At least one category is required" },
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
      categories,
      ageGroup: ageGroup as (typeof VALID_AGE_GROUPS)[number],
      tags: JSON.parse(JSON.stringify(tags)),
      contentPackId: contentPackId || null,
    },
  });

  return NextResponse.json(imageAsset, { status: 201 });
}
