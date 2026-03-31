import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
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
