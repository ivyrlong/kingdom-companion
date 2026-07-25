import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/admin/vocabulary
 *
 * Filters (query params):
 *   ?q=...                — text match against display/term
 *   ?type=WORD|PHRASE     — filter by term type
 *   ?category=<slug>      — filter to terms IN that category
 *   ?uncategorized=1      — filter to terms with NO categories at all
 *   ?limit=100 (default)  — page size (max 500)
 *   ?offset=0             — pagination cursor
 *
 * Returns:
 *   {
 *     terms: Array<{
 *       id, term, display, type, ageAppropriate, bibleRef, useCount,
 *       categories: [{ id, slug, name, icon }],
 *       packLinkCount: number,
 *     }>,
 *     total: number,
 *   }
 */

const MAX_LIMIT = 500;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const type = url.searchParams.get("type");
  const category = url.searchParams.get("category");
  const uncategorized = url.searchParams.get("uncategorized") === "1";
  const limit = Math.min(
    parseInt(url.searchParams.get("limit") ?? "100", 10) || 100,
    MAX_LIMIT,
  );
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10) || 0;

  const where: Prisma.VocabularyTermWhereInput = {};
  if (q) {
    where.OR = [
      { term: { contains: q } },
      { display: { contains: q, mode: "insensitive" } },
    ];
  }
  if (type === "WORD" || type === "PHRASE") where.type = type;
  if (category) {
    where.categories = { some: { category: { slug: category } } };
  }
  if (uncategorized) {
    where.categories = { none: {} };
  }

  const [terms, total] = await Promise.all([
    prisma.vocabularyTerm.findMany({
      where,
      orderBy: [{ display: "asc" }],
      skip: offset,
      take: limit,
      include: {
        categories: {
          include: {
            category: {
              select: { id: true, slug: true, name: true, icon: true },
            },
          },
        },
        _count: { select: { packLinks: true } },
      },
    }),
    prisma.vocabularyTerm.count({ where }),
  ]);

  return NextResponse.json({
    terms: terms.map((t) => ({
      id: t.id,
      term: t.term,
      display: t.display,
      type: t.type,
      ageAppropriate: t.ageAppropriate,
      bibleRef: t.bibleRef,
      useCount: t.useCount,
      categories: t.categories.map((c) => c.category),
      packLinkCount: t._count.packLinks,
    })),
    total,
  });
}
