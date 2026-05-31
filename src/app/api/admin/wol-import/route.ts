import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { importFromWolUrl } from "@/lib/wol-import";

/**
 * POST /api/admin/wol-import
 * Body: { url: string }   — a wol.jw.org canonical /wol/d/ URL or bare docId
 * Returns: a DraftPack the admin can review and submit via the usual
 *          POST /api/admin/content-packs flow. NO article body prose is
 *          ever stored — only structure, citations, and derived data.
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
    const draft = await importFromWolUrl(url.trim());
    return NextResponse.json(draft);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
