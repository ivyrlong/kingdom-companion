import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseCsvObjects } from "@/lib/csv";
import { createOrReplaceDailyText } from "@/lib/daily-text";

const REQUIRED = [
  "date",
  "scriptureref",
  "scripturetext",
  "comment",
  "simplifiedcomment",
];

interface RowResult {
  line: number;
  date: string;
  status: "created" | "replaced" | "error";
  message?: string;
  instances?: number;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const csv = body?.csv;
  if (typeof csv !== "string" || !csv.trim()) {
    return NextResponse.json({ error: "No CSV provided" }, { status: 400 });
  }

  const { headers, rows } = parseCsvObjects(csv);
  const missing = REQUIRED.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: `Missing required column(s): ${missing.join(", ")}. Expected headers: date, scriptureRef, scriptureText, comment, simplifiedComment`,
      },
      { status: 400 },
    );
  }
  if (rows.length === 0) {
    return NextResponse.json({ error: "No data rows found" }, { status: 400 });
  }

  const results: RowResult[] = [];
  let created = 0;
  let replaced = 0;

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const line = idx + 2; // +1 for header, +1 for 1-based

    const dateRaw = r.date;
    const date = new Date(dateRaw);
    if (!dateRaw || isNaN(date.getTime())) {
      results.push({
        line,
        date: dateRaw || "",
        status: "error",
        message: "Invalid or missing date (use YYYY-MM-DD)",
      });
      continue;
    }
    if (
      !r.scriptureref ||
      !r.scripturetext ||
      !r.comment ||
      !r.simplifiedcomment
    ) {
      results.push({
        line,
        date: dateRaw,
        status: "error",
        message:
          "Missing scriptureRef, scriptureText, comment, or simplifiedComment",
      });
      continue;
    }
    try {
      const res = await createOrReplaceDailyText({
        date,
        scriptureRef: r.scriptureref,
        scriptureText: r.scripturetext,
        comment: r.comment,
        simplifiedComment: r.simplifiedcomment,
      });
      if (res.replaced) replaced++;
      else created++;
      results.push({
        line,
        date: dateRaw,
        status: res.replaced ? "replaced" : "created",
        instances: res.instancesCreated,
      });
    } catch (e) {
      results.push({
        line,
        date: dateRaw,
        status: "error",
        message: e instanceof Error ? e.message : "Failed to save",
      });
    }
  }

  return NextResponse.json({
    total: rows.length,
    created,
    replaced,
    errors: results.filter((x) => x.status === "error").length,
    results,
  });
}
