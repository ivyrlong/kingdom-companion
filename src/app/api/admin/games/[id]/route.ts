import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile, unlink } from "fs/promises";
import path from "path";

// Card-art slots. SHARED is the "All ages" fallback; the others override it
// for a specific viewer age group.
const VALID_SLOTS = [
  "SHARED",
  "LITTLE_ONES",
  "YOUTH",
  "ADULT",
  "FAMILY",
] as const;
type Slot = (typeof VALID_SLOTS)[number];

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "svg"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async function authorize() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return null;
  }
  return session;
}

function asImageMap(value: unknown): Record<string, string> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (typeof v === "string" && v) out[k] = v;
    }
    return out;
  }
  return {};
}

// Remove the file backing `imagePath` from disk, but only if no remaining
// slot in this game still points at it (an admin may reuse one file).
async function maybeUnlink(
  imagePath: string | undefined,
  remaining: Record<string, string>
) {
  if (!imagePath) return;
  if (Object.values(remaining).includes(imagePath)) return;
  if (!imagePath.startsWith("/uploads/")) return;
  const absolutePath = path.join(process.cwd(), "public", imagePath);
  try {
    await unlink(absolutePath);
  } catch (err) {
    console.warn(`Could not delete file at ${absolutePath}:`, err);
  }
}

// Upload an image and assign it to one slot of a game's card art.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await authorize())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const slot = (formData.get("slot") as string) || "";

  if (!file) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }
  if (!VALID_SLOTS.includes(slot as Slot)) {
    return NextResponse.json(
      { error: `slot must be one of: ${VALID_SLOTS.join(", ")}` },
      { status: 400 }
    );
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}` },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File size exceeds 10MB limit" },
      { status: 400 }
    );
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json(
      { error: `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}` },
      { status: 400 }
    );
  }

  const uniqueName = `card-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;
  const publicPath = `/uploads/${uniqueName}`;
  const absolutePath = path.join(process.cwd(), "public", "uploads", uniqueName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, buffer);

  const images = asImageMap(game.cardImages);
  const previous = images[slot];
  images[slot] = publicPath;

  const updated = await prisma.game.update({
    where: { id },
    data: { cardImages: images },
    select: { id: true, slug: true, title: true, cardImages: true },
  });

  // The slot was reassigned — clean up the file it used to point at.
  await maybeUnlink(previous, images);

  return NextResponse.json(updated, { status: 201 });
}

// Clear one slot of a game's card art (?slot=SHARED|LITTLE_ONES|...).
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await authorize())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const slot = new URL(req.url).searchParams.get("slot") || "";
  if (!VALID_SLOTS.includes(slot as Slot)) {
    return NextResponse.json(
      { error: `slot must be one of: ${VALID_SLOTS.join(", ")}` },
      { status: 400 }
    );
  }

  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const images = asImageMap(game.cardImages);
  const removed = images[slot];
  delete images[slot];

  const updated = await prisma.game.update({
    where: { id },
    data: { cardImages: images },
    select: { id: true, slug: true, title: true, cardImages: true },
  });

  await maybeUnlink(removed, images);

  return NextResponse.json(updated);
}
