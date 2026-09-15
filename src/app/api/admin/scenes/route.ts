import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // scenes can be larger than stickers

function parseStringArray(raw: FormDataEntryValue | null): string[] {
  if (raw == null) return [];
  const str = raw.toString().trim();
  if (!str) return [];
  try {
    const arr = JSON.parse(str);
    if (Array.isArray(arr)) return arr.map(String).map((s) => s.trim()).filter(Boolean);
  } catch {
    // fall through
  }
  return str.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Guess a slug + name from a filename like `scene-lakeside.png`. */
function guessSceneFromFilename(filename: string): {
  slug: string;
  name: string;
} | null {
  const base = filename.replace(/\.[a-z0-9]+$/i, "").toLowerCase();
  const parts = base.split("-");
  if (parts[0] !== "scene" || parts.length < 2) return null;
  const slug = parts.slice(1).join("-");
  const name = parts
    .slice(1)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
  return { slug, name };
}

// ── GET: list scenes ──────────────────────────────────────────────────
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("activeOnly") === "true";

  const scenes = await prisma.scene.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(scenes);
}

// ── POST: upload a scene ──────────────────────────────────────────────
// Body: multipart FormData
//   file          File           (required)
//   slug          string?        override
//   name          string?        override
//   moodTags      string?        JSON array or comma-separated
//   paletteAccent string?        optional dominant color
//   sortOrder     string?        default 0
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Invalid type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}` },
      { status: 400 },
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File exceeds 15 MB" }, { status: 400 });
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json(
      { error: `Invalid extension. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}` },
      { status: 400 },
    );
  }

  const guess = guessSceneFromFilename(file.name);
  const slug = (formData.get("slug")?.toString() || guess?.slug || "").trim();
  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return NextResponse.json(
      { error: "slug must be lowercase-kebab" },
      { status: 400 },
    );
  }
  const name = (formData.get("name")?.toString() || guess?.name || slug).trim();
  const moodTags = parseStringArray(formData.get("moodTags"));
  const paletteAccent = formData.get("paletteAccent")?.toString().trim() || null;
  const sortOrder = Number.parseInt(formData.get("sortOrder")?.toString() ?? "0", 10) || 0;

  const existing = await prisma.scene.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      { error: `A scene with slug "${slug}" already exists (id ${existing.id}).` },
      { status: 409 },
    );
  }

  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "scenes");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, uniqueName), Buffer.from(await file.arrayBuffer()));
  const relativePath = `uploads/scenes/${uniqueName}`;

  const scene = await prisma.scene.create({
    data: {
      slug,
      name,
      path: relativePath,
      moodTags,
      paletteAccent,
      sortOrder,
    },
  });

  return NextResponse.json(scene, { status: 201 });
}
