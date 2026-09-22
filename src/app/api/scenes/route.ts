import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/scenes — active scenes for the Paradise Builder scene picker.
 * Signed-in users only (Paradise Builder is a save-state game).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const scenes = await prisma.scene.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      path: true,
      moodTags: true,
      paletteAccent: true,
    },
  });
  return NextResponse.json(scenes);
}
