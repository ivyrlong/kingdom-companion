import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  ageGroup: z.enum(["LITTLE_ONES", "YOUTH", "ADULT", "FAMILY"]).optional(),
  displayName: z.string().min(1).max(50).optional(),
  congregation: z.string().max(100).optional(),
  encyclopediaMode: z.enum(["PLAYFUL", "STUDY"]).optional(),
  receiveCuratedFindings: z.boolean().optional(),
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

  const {
    ageGroup,
    displayName,
    congregation,
    encyclopediaMode,
    receiveCuratedFindings,
  } = parsed.data;

  // Update user age group if provided
  if (ageGroup) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { ageGroup },
    });
  }

  // Update profile fields if provided
  const profileData = {
    ...(displayName !== undefined && { displayName }),
    ...(congregation !== undefined && { congregation }),
    ...(encyclopediaMode !== undefined && { encyclopediaMode }),
    ...(receiveCuratedFindings !== undefined && { receiveCuratedFindings }),
  };
  if (Object.keys(profileData).length > 0) {
    await prisma.profile.update({
      where: { userId: session.user.id },
      data: profileData,
    });
  }

  return NextResponse.json({ success: true });
}
