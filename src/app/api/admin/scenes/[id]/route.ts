import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { unlink } from "fs/promises";
import path from "path";
import { z } from "zod";

const updateSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "lowercase-kebab only")
    .optional(),
  name: z.string().min(1).optional(),
  moodTags: z.array(z.string()).optional(),
  paletteAccent: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
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

  try {
    const scene = await prisma.scene.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json(scene);
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

  const scene = await prisma.scene.findUnique({ where: { id } });
  if (!scene) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.scene.delete({ where: { id } });

  try {
    await unlink(path.join(process.cwd(), "public", scene.path));
  } catch (e) {
    console.warn(`Could not unlink scene file ${scene.path}:`, e);
  }

  return NextResponse.json({ ok: true });
}
