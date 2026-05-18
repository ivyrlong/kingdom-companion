import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function authorize() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return null;
  }
  return session;
}

// List all games with their per-audience card art, for the admin Games page.
export async function GET() {
  const session = await authorize();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const games = await prisma.game.findMany({
    orderBy: { title: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      ageGroup: true,
      isActive: true,
      cardImages: true,
    },
  });

  return NextResponse.json(games);
}
