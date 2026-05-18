import { prisma } from "@/lib/db";

/**
 * The current user's age group, read from the database (the source of truth).
 *
 * The session/JWT copy of ageGroup goes stale after a profile age-group change
 * until the token re-signs, so server components must resolve it through here
 * — never read `session.user.ageGroup` directly for behaviour decisions.
 * Falls back to "YOUTH" when there is no signed-in user.
 */
export async function getAgeGroup(
  userId: string | undefined | null,
): Promise<string> {
  if (!userId) return "YOUTH";
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { ageGroup: true },
  });
  return user?.ageGroup ?? "YOUTH";
}
