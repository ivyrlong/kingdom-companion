// Resolve a game's card art for a given viewer.
//
// Game.cardImages is a JSON map keyed by "SHARED" plus each age group. A viewer
// sees their own age group's image if set, otherwise the shared "All ages"
// image, otherwise null (the UI shows a placeholder).
export function resolveCardImage(
  cardImages: unknown,
  viewerAgeGroup: string,
): string | null {
  if (
    !cardImages ||
    typeof cardImages !== "object" ||
    Array.isArray(cardImages)
  ) {
    return null;
  }
  const map = cardImages as Record<string, unknown>;
  const picked = map[viewerAgeGroup] ?? map.SHARED;
  return typeof picked === "string" && picked ? picked : null;
}
