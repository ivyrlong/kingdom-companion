import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseArticleText } from "@/lib/content-parser";

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
  return NextResponse.json(parsed);
}
