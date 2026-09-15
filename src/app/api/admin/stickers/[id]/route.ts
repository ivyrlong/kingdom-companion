import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { unlink } from "fs/promises";
import path from "path";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const VALID_KINDS = ["PERSON", "ANIMAL_PAIR", "ANIMAL_SOLO", "PLANT", "HOME", "SKY"] as const;

const updateSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "lowercase-kebab only")
    .optional(),
  name: z.string().min(1).optional(),
  kind: z.enum(VALID_KINDS).optional(),
  altText: z.string().optional(),
  tags: z.array(z.string()).optional(),
  ageAppropriate: z.array(z.string()).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  characterSlug: z.string().nullable().optional(), // "" or null → detach; string → attach by slug
});

async function requireAdmin() {
  const session = await auth();
  return !!session?.user && (session.user as { role?: string }).role === "ADMIN";
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { characterSlug, ...rest } = parsed.data;
  const data: Prisma.StickerUpdateInput = { ...rest };

  if (characterSlug !== undefined) {
    if (characterSlug === null || characterSlug === "") {
      data.character = { disconnect: true };
    } else {
      const c = await prisma.character.findUnique({ where: { slug: characterSlug } });
      if (!c) {
        return NextResponse.json(
          { error: `character not found: ${characterSlug}` },
          { status: 400 },
        );
      }
      data.character = { connect: { id: c.id } };
    }
  }

  try {
    const sticker = await prisma.sticker.update({
      where: { id },
      data,
      include: {
        character: {
          select: { id: true, slug: true, name: true, familyName: true, role: true, variant: true },
        },
      },
    });
    return NextResponse.json(sticker);
  } catch (e) {
    if ((e as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "slug already in use" }, { status: 409 });
    }
    throw e;
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const sticker = await prisma.sticker.findUnique({ where: { id } });
  if (!sticker) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete DB row first so the file is only orphaned if the row lived.
  await prisma.sticker.delete({ where: { id } });

  // If this sticker was a character's canonical portrait, clear the pointer
  // so the character is not left referencing a dead file.
  if (sticker.characterId) {
    await prisma.character.updateMany({
      where: { id: sticker.characterId, portraitPath: sticker.path },
      data: { portraitPath: null },
    });
  }

  // Best-effort unlink — the DB is authoritative, missing file is not fatal.
  try {
    await unlink(path.join(process.cwd(), "public", sticker.path));
  } catch (e) {
    console.warn(`Could not unlink sticker file ${sticker.path}:`, e);
  }

  return NextResponse.json({ ok: true });
}
