import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/admin/characters
 *
 * Read-only listing of the character bible for pickers in the admin UI
 * (sticker upload, story panel composer, etc.). No POST here — characters
 * are seeded from prompts/characters.md via prisma/seed-characters.ts.
 *
 * Query params:
 *   variant  = "blonde" | "brunette" | "black" | "hispanic" | "asian"
 *   role     = "grandmother" | ... | "child-boy"
 *   family   = "Miller" | "Bell" | "Reyes" | "Kim" | "Anderson"
 *   unlinked = "true"    only characters that don't yet have a sticker
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const variant = searchParams.get("variant");
  const role = searchParams.get("role");
  const family = searchParams.get("family");
  const unlinked = searchParams.get("unlinked") === "true";

  const where: {
    variant?: string;
    role?: string;
    familyName?: string;
    sticker?: { is: null };
  } = {};
  if (variant) where.variant = variant;
  if (role) where.role = role;
  if (family) where.familyName = family;
  if (unlinked) where.sticker = { is: null };

  const characters = await prisma.character.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    include: {
      sticker: { select: { id: true, slug: true, path: true } },
    },
    orderBy: [{ familyName: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(characters);
}
