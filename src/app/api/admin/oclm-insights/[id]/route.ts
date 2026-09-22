import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  applyPastedInsights,
  buildPromptForPack,
} from "@/lib/oclm-insights";
import type { WorkbookSection } from "@/components/WorkbookPanel";

/**
 * Per-OCLM-pack AI insights endpoint. Two modes:
 *
 *   GET  /api/admin/oclm-insights/[id]
 *     Returns a copy-paste prompt the admin can drop into ChatGPT or
 *     Claude web. Response shape:
 *       { prompt: string, expectedIds: string[], failures?: [...] }
 *
 *   POST /api/admin/oclm-insights/[id]
 *     Body: { response: string }  — the pasted JSON blob
 *     Merges valid entries into `sections[].parts[].aiContent`.
 *     Response: { matched, missingIds, unmatchedIds }
 *
 * No Anthropic API key required — this endpoint is the manual "run it
 * yourself, paste back the answer" flow.
 */

async function authorize() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return null;
  }
  return session;
}

async function loadOclmPack(id: string) {
  const pack = await prisma.contentPack.findUnique({ where: { id } });
  if (!pack) return { error: "Not found", status: 404 as const };
  if (pack.source !== "OCLM") {
    return {
      error: `Pack is source=${pack.source}, expected OCLM.`,
      status: 400 as const,
    };
  }
  if (!pack.sourceUrl) {
    return {
      error:
        "This pack has no sourceUrl. Re-import via the /wol/d/ URL to enable AI insights.",
      status: 400 as const,
    };
  }
  if (!Array.isArray(pack.sections) || pack.sections.length === 0) {
    return {
      error: "This pack has no workbook sections.",
      status: 400 as const,
    };
  }
  return {
    pack,
    sections: pack.sections as unknown as WorkbookSection[],
  };
}

// ── GET — return the paste-into-AI prompt ─────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await authorize())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const loaded = await loadOclmPack(id);
  if ("error" in loaded) {
    return NextResponse.json({ error: loaded.error }, { status: loaded.status });
  }

  try {
    const result = await buildPromptForPack({
      sourceUrl: loaded.pack.sourceUrl,
      sections: loaded.sections,
    });
    return NextResponse.json({
      prompt: result.prompt,
      expectedIds: result.expectedIds,
      failures: result.failures.length > 0 ? result.failures : undefined,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to build prompt." },
      { status: 500 },
    );
  }
}

// ── POST — accept the pasted AI response and merge it in ──────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await authorize())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const loaded = await loadOclmPack(id);
  if ("error" in loaded) {
    return NextResponse.json({ error: loaded.error }, { status: loaded.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const response =
    typeof body === "object" && body !== null && "response" in body
      ? (body as { response: unknown }).response
      : undefined;
  if (typeof response !== "string" || !response.trim()) {
    return NextResponse.json(
      { error: "Missing required field: response (the pasted AI output)." },
      { status: 400 },
    );
  }

  let result;
  try {
    result = await applyPastedInsights(
      {
        sourceUrl: loaded.pack.sourceUrl,
        sections: loaded.sections,
      },
      response,
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to apply insights." },
      { status: 400 },
    );
  }

  await prisma.contentPack.update({
    where: { id },
    data: { sections: result.updatedSections as unknown as object },
  });

  return NextResponse.json({
    matched: result.matched,
    missingIds: result.missingIds,
    unmatchedIds: result.unmatchedIds,
  });
}
