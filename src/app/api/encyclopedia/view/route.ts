import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const viewSchema = z.object({
  entryId: z.string().min(1),
});

/**
 * POST /api/encyclopedia/view
 * Marks a collected entry as viewed (files it out of the "New" tab).
 * Idempotent: only sets viewedAt the first time; later calls are no-ops.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = viewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { entryId } = parsed.data;
  const userId = session.user.id;

  // Only the user's own, not-yet-viewed collection row is touched.
  const result = await prisma.userEncyclopediaCollection.updateMany({
    where: { userId, entryId, viewedAt: null },
    data: { viewedAt: new Date() },
  });

  return NextResponse.json({ success: true, updated: result.count });
}
