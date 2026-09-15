import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/stickers — active stickers for the Paradise Builder tray.
 * Grouped client-side by `kind`. Signed-in users only.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const stickers = await prisma.sticker.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      kind: true,
      path: true,
      altText: true,
      character: { select: { name: true, familyName: true, role: true } },
    },
  });
  return NextResponse.json(stickers);
}
