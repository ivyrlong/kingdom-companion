import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { guessStickerFromFilename, type StickerKindSlug } from "@/lib/sticker-metadata";

const ALLOWED_TYPES = ["image/png", "image/webp", "image/jpeg"];
const ALLOWED_EXTENSIONS = ["png", "webp", "jpg", "jpeg"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB — stickers should be well under this

const VALID_KINDS = new Set<StickerKindSlug>([
  "PERSON",
  "ANIMAL_PAIR",
  "ANIMAL_SOLO",
  "PLANT",
  "HOME",
  "SKY",
]);

function parseStringArray(raw: FormDataEntryValue | null): string[] {
  if (raw == null) return [];
  const str = raw.toString().trim();
  if (!str) return [];
  // Accept JSON array or comma-separated.
  try {
    const arr = JSON.parse(str);
    if (Array.isArray(arr)) return arr.map(String).map((s) => s.trim()).filter(Boolean);
  } catch {
    // Fall through to comma-split.
  }
  return str.split(",").map((s) => s.trim()).filter(Boolean);
}

// ── GET: list stickers ────────────────────────────────────────────────
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind");
  const activeOnly = searchParams.get("activeOnly") === "true";

  const where: { kind?: StickerKindSlug; isActive?: boolean } = {};
  if (kind && VALID_KINDS.has(kind as StickerKindSlug)) {
    where.kind = kind as StickerKindSlug;
  }
  if (activeOnly) where.isActive = true;

  const stickers = await prisma.sticker.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    include: {
      character: {
        select: { id: true, slug: true, name: true, familyName: true, role: true, variant: true },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(stickers);
}

// ── POST: upload one sticker ──────────────────────────────────────────
// Body: multipart FormData
//   file          File           (required) the PNG/WebP/JPG
//   slug          string?        override; else derived from filename
//   name          string?        override; else Title-Cased from filename
//   kind          StickerKind?   override; else guessed from filename
//   characterSlug string?        link a Character by slug (people stickers)
//   tags          string?        JSON array or comma-separated
//   ageAppropriate string?       JSON array or comma-separated
//   altText       string?        default ""
//   sortOrder     string?        default 0
//
// If characterSlug is omitted AND the filename parses as a PERSON, we
// auto-match a Character by (variant, role). If both are set we honour
// characterSlug.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}` },
      { status: 400 },
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File exceeds 10 MB" }, { status: 400 });
  }
  const originalName = file.name;
  const ext = originalName.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json(
      { error: `Invalid extension. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}` },
      { status: 400 },
    );
  }

  // Auto-fill from filename, then apply explicit overrides.
  const guess = guessStickerFromFilename(originalName);

  const kindOverride = formData.get("kind")?.toString();
  const kind: StickerKindSlug | null =
    kindOverride && VALID_KINDS.has(kindOverride as StickerKindSlug)
      ? (kindOverride as StickerKindSlug)
      : (guess?.kind ?? null);
  if (!kind) {
    return NextResponse.json(
      { error: "kind is required (could not infer from filename)" },
      { status: 400 },
    );
  }

  const slug = (formData.get("slug")?.toString() || guess?.suggestedSlug || "").trim();
  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return NextResponse.json(
      { error: "slug must be lowercase-kebab (letters, digits, hyphens)" },
      { status: 400 },
    );
  }

  const name = (formData.get("name")?.toString() || guess?.suggestedName || slug).trim();
  const altText = formData.get("altText")?.toString() ?? "";
  const tags = parseStringArray(formData.get("tags"));
  const ageAppropriate = parseStringArray(formData.get("ageAppropriate"));
  const sortOrder = Number.parseInt(formData.get("sortOrder")?.toString() ?? "0", 10) || 0;

  // Character link: explicit slug beats auto-match. Auto-match only for PERSON kind.
  let characterId: string | null = null;
  const explicitCharacterSlug = formData.get("characterSlug")?.toString().trim();
  if (explicitCharacterSlug) {
    const c = await prisma.character.findUnique({ where: { slug: explicitCharacterSlug } });
    if (!c) {
      return NextResponse.json(
        { error: `character not found: ${explicitCharacterSlug}` },
        { status: 400 },
      );
    }
    characterId = c.id;
  } else if (kind === "PERSON" && guess?.variant && guess?.role) {
    const c = await prisma.character.findFirst({
      where: { variant: guess.variant, role: guess.role },
    });
    if (c) characterId = c.id;
  }

  // Fail loudly if slug already exists — avoid silent overwrite.
  const existing = await prisma.sticker.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      { error: `A sticker with slug "${slug}" already exists (id ${existing.id}).` },
      { status: 409 },
    );
  }

  // Save file to public/uploads/stickers/. Random suffix avoids collisions
  // even if two admins upload the same-named file within the same ms.
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "stickers");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, uniqueName), Buffer.from(await file.arrayBuffer()));
  const relativePath = `uploads/stickers/${uniqueName}`;

  const sticker = await prisma.sticker.create({
    data: {
      slug,
      name,
      kind,
      path: relativePath,
      tags,
      ageAppropriate,
      altText,
      sortOrder,
      characterId,
    },
    include: {
      character: {
        select: { id: true, slug: true, name: true, familyName: true, role: true, variant: true },
      },
    },
  });

  // Backfill the character's portraitPath if this is its first sticker — the
  // sticker PNG is the character's canonical portrait for later reuse.
  if (characterId) {
    const c = await prisma.character.findUnique({
      where: { id: characterId },
      select: { portraitPath: true },
    });
    if (c && !c.portraitPath) {
      await prisma.character.update({
        where: { id: characterId },
        data: { portraitPath: relativePath },
      });
    }
  }

  return NextResponse.json(sticker, { status: 201 });
}
