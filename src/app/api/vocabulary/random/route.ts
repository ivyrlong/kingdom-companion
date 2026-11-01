/**
 * GET /api/vocabulary/random — pull N random terms from the shared
 * VocabularyTerm catalog. Powers the standalone (no-content-pack) play
 * of word-based games (Hangman, WordSearch, Crossword, Cryptogram
 * vocab-fallback) so they draw on everything the admin has ever
 * ingested rather than each game's small hardcoded DEFAULT_WORDS.
 *
 * Query parameters:
 *   type      — "WORD" or "PHRASE" (default: all)
 *   limit     — max rows to return, 1..200 (default 20)
 *   minLen    — minimum display length in characters (optional)
 *   maxLen    — maximum display length in characters (optional)
 *
 * Response: { terms: Array<{ term, display, type }> }
 *
 * No auth: this is public reference data, same as the Bible verse
 * lookup that will follow.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

const MAX_LIMIT = 200;

export async function GET(req: Request) {
  const url = new URL(req.url);

  const typeParam = url.searchParams.get("type");
  const type: "WORD" | "PHRASE" | null =
    typeParam === "WORD" || typeParam === "PHRASE" ? typeParam : null;

  const rawLimit = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  const limit = Math.max(
    1,
    Math.min(MAX_LIMIT, Number.isFinite(rawLimit) ? rawLimit : 20),
  );

  const minLen = Number.parseInt(url.searchParams.get("minLen") ?? "", 10);
  const maxLen = Number.parseInt(url.searchParams.get("maxLen") ?? "", 10);

  const conds: Prisma.Sql[] = [];
  if (type) {
    conds.push(Prisma.sql`"type"::text = ${type}`);
  }
  if (Number.isFinite(minLen) && minLen > 0) {
    conds.push(Prisma.sql`LENGTH("display") >= ${minLen}`);
  }
  if (Number.isFinite(maxLen) && maxLen > 0) {
    conds.push(Prisma.sql`LENGTH("display") <= ${maxLen}`);
  }
  const where =
    conds.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(conds, " AND ")}`
      : Prisma.empty;

  // Postgres ORDER BY RANDOM() is a full-table sort, but at the current
  // catalog scale (~1k-10k rows) it's still well under a few ms. If the
  // catalog grows past ~100k rows we can switch to TABLESAMPLE SYSTEM
  // or random-OID sampling.
  const terms = await prisma.$queryRaw<
    Array<{ term: string; display: string; type: "WORD" | "PHRASE" }>
  >(Prisma.sql`
    SELECT "term", "display", "type"
    FROM "VocabularyTerm"
    ${where}
    ORDER BY RANDOM()
    LIMIT ${limit}
  `);

  return NextResponse.json({ terms });
}
