import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  ageGroup: z.enum(["LITTLE_ONES", "YOUTH", "ADULT", "FAMILY"]).optional(),
  displayName: z.string().min(1).max(50).optional(),
  congregation: z.string().max(100).optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { ageGroup, displayName, congregation } = parsed.data;

  // Update user age group if provided
  if (ageGroup) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { ageGroup },
    });
  }

  // Update profile fields if provided
  if (displayName !== undefined || congregation !== undefined) {
    await prisma.profile.update({
      where: { userId: session.user.id },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(congregation !== undefined && { congregation }),
      },
    });
  }

  return NextResponse.json({ success: true });
}
