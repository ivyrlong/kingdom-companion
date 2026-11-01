import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseArticleText } from "@/lib/content-parser";
import { prisma } from "@/lib/db";
import { fillScriptureTexts } from "@/lib/bible-verses";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { text } = await req.json();
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  const parsed = parseArticleText(text);

  // Dedupe + fill scripture text from the BibleVerse catalog before the
  // DraftPack is handed back to the admin UI, so the Scriptures panel
  // in the review step shows verbatim NWT text ready for edit instead
  // of empty boxes. The response shape now carries {reference, text}[]
  // (was: string[]) — the admin UI consumes both forms via a shim.
  const rawScriptures = Array.isArray(parsed.scriptures) ? parsed.scriptures : [];
  const inputScriptures = rawScriptures.map((s) =>
    typeof s === "string" ? { reference: s, text: "" } : s,
  );
  let scriptures: Array<{ reference: string; text: string }> = inputScriptures;
  try {
    scriptures = await fillScriptureTexts(prisma, inputScriptures);
  } catch (e) {
    console.error(
      "[parse] scripture fill failed:",
      e instanceof Error ? e.message : e,
    );
  }

  return NextResponse.json({ ...parsed, scriptures });
}
