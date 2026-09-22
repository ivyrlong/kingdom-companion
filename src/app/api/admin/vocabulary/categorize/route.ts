import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

/**
 * POST /api/admin/vocabulary/categorize
 *
 * Body:
 *   {
 *     termIds: string[],       // 1..500 term IDs to act on
 *     add?: string[],          // category IDs to add
 *     remove?: string[],       // category IDs to remove
 *   }
 *
 * Idempotent — adding a category the term already has is a no-op
 * (compound PK on the join table). Removing one it doesn't have is
 * a no-op. Same term/category pair never duplicates.
 *
 * Returns: { added, removed } — count of link-rows created/deleted.
 */

const bodySchema = z.object({
  termIds: z.array(z.string().min(1)).min(1).max(500),
  add: z.array(z.string().min(1)).optional().default([]),
  remove: z.array(z.string().min(1)).optional().default([]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { termIds, add, remove } = parsed.data;
  if (add.length === 0 && remove.length === 0) {
    return NextResponse.json({ added: 0, removed: 0 });
  }

  // Adds: build the full cross-product, skipDuplicates lets the compound
  // PK silently drop existing links.
  let added = 0;
  if (add.length > 0) {
    const rows = termIds.flatMap((termId) =>
      add.map((categoryId) => ({ termId, categoryId })),
    );
    const result = await prisma.vocabularyTermCategory.createMany({
      data: rows,
      skipDuplicates: true,
    });
    added = result.count;
  }

  let removed = 0;
  if (remove.length > 0) {
    const result = await prisma.vocabularyTermCategory.deleteMany({
      where: {
        termId: { in: termIds },
        categoryId: { in: remove },
      },
    });
    removed = result.count;
  }

  return NextResponse.json({ added, removed });
}
