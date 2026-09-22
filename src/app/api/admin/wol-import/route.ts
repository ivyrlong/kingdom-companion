import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { importPackFromWolUrl } from "@/lib/wol-import";

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
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
