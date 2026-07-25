import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/admin/vocabulary/categories
 *
 * Returns all active categories + term counts, ordered by sortOrder.
 * Feeds the sidebar/tab list in the Vocabulary Manager.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const categories = await prisma.vocabularyCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { terms: true } } },
  });

  const uncategorizedCount = await prisma.vocabularyTerm.count({
    where: { categories: { none: {} } },
  });

  return NextResponse.json({
    categories: categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      icon: c.icon,
      termCount: c._count.terms,
    })),
    uncategorizedCount,
  });
}
