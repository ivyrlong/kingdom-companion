import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { importPackFromWolUrl } from "@/lib/wol-import";
import { prisma } from "@/lib/db";
import { fillScriptureTexts } from "@/lib/bible-verses";

/**
 * POST /api/admin/wol-import
 * Body: { url: string }   — a wol.jw.org canonical /wol/d/ URL or bare docId
 * Returns: { kind: "WATCHTOWER" | "OCLM", pack: ... } — discriminated union
 *          so the admin UI can branch its prefill on the publication type.
 *          NO article body prose is ever stored — only structure, citations,
 *          and derived data.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const url =
    typeof body === "object" && body !== null && "url" in body
      ? (body as { url: unknown }).url
      : undefined;
  if (typeof url !== "string" || !url.trim()) {
    return NextResponse.json(
      { error: "Missing required field: url" },
      { status: 400 },
    );
  }

  try {
    const result = await importPackFromWolUrl(url.trim());

    // Fill scripture text from the local BibleVerse catalog BEFORE the
    // DraftPack is handed to the admin UI, so the preview shows the
    // verbatim NWT text ready for review/edit — not empty text boxes.
    // The dedupe step also collapses variant spellings of the same
    // reference ("Prov. 22:4" / "Proverbs 22:4") so the Scriptures
    // panel doesn't repeat citations.
    try {
      const filled = await fillScriptureTexts(prisma, result.pack.scriptures);
      result.pack.scriptures = filled;
    } catch (fillErr) {
      // Don't fail the import just because the catalog is missing a
      // book — the admin can still paste text manually and the save
      // path will retry the fill.
      console.error(
        "[wol-import] scripture fill failed:",
        fillErr instanceof Error ? fillErr.message : fillErr,
      );
    }

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
