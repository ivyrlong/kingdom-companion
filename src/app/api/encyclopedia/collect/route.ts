import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const collectSchema = z.object({
  entryId: z.string().min(1),
  source: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = collectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { entryId, source } = parsed.data;
  const userId = session.user.id;

  // Verify entry exists and is active
  const entry = await prisma.encyclopediaEntry.findUnique({
    where: { id: entryId },
  });
  if (!entry || !entry.isActive) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  // upsert: ignore duplicate collection attempts
  const collection = await prisma.userEncyclopediaCollection.upsert({
    where: { userId_entryId: { userId, entryId } },
    create: { userId, entryId, source: source ?? null },
    update: {}, // no-op if already collected
  });

  return NextResponse.json({ success: true, collection });
}
