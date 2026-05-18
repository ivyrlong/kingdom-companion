// Single source of truth for the age-tiered encyclopedia.
//
// One feature, four faces. Every gate (the Explore tab, the page data query,
// and in-game discovery) must derive behaviour from getEncyclopediaCapabilities
// — never hardcode age-group checks.

export type EncyclopediaMode = "PLAYFUL" | "STUDY";

export interface EncyclopediaSettings {
  encyclopediaMode: EncyclopediaMode;
  receiveCuratedFindings: boolean;
}

export interface EncyclopediaCapabilities {
  enabled: boolean;
  /** Display name of the tab / section for this user. */
  name: string;
  /** Receives admin-curated entries discovered by playing games. */
  receivesCurated: boolean;
  /** Can create their own personal entries. */
  canAuthor: boolean;
  /** Effective mode (Little Ones always PLAYFUL, Adult always STUDY). */
  mode: EncyclopediaMode;
  /** Show mystery "?" cards for not-yet-found curated entries. */
  showSilhouettes: boolean;
}

const DEFAULTS: EncyclopediaSettings = {
  encyclopediaMode: "PLAYFUL",
  receiveCuratedFindings: false,
};

export function getEncyclopediaCapabilities(
  ageGroup: string | null | undefined,
  settings?: Partial<EncyclopediaSettings> | null,
): EncyclopediaCapabilities {
  const mode: EncyclopediaMode =
    settings?.encyclopediaMode ?? DEFAULTS.encyclopediaMode;
  const receiveCurated =
    settings?.receiveCuratedFindings ?? DEFAULTS.receiveCuratedFindings;

  switch (ageGroup) {
    case "LITTLE_ONES":
      return {
        enabled: true,
        name: "Sticker Book",
        receivesCurated: true,
        canAuthor: false,
        mode: "PLAYFUL",
        showSilhouettes: true,
      };
    case "ADULT":
      return {
        enabled: true,
        name: "Study Notebook",
        receivesCurated: receiveCurated,
        canAuthor: true,
        mode: "STUDY",
        showSilhouettes: false,
      };
    case "YOUTH":
    case "FAMILY":
    default:
      return {
        enabled: true,
        name: "Discovery Journal",
        receivesCurated: true,
        canAuthor: true,
        mode,
        showSilhouettes: mode === "PLAYFUL",
      };
  }
}

// Which curated EncyclopediaEntry.ageGroup buckets a viewer should receive.
// FAMILY content is "all ages"; a Family profile is a mixed household.
export function curatedAgeFilter(ageGroup: string | null | undefined): string[] {
  switch (ageGroup) {
    case "LITTLE_ONES":
      return ["LITTLE_ONES", "FAMILY"];
    case "ADULT":
      return ["ADULT", "FAMILY"];
    case "FAMILY":
      return ["LITTLE_ONES", "YOUTH", "FAMILY"];
    case "YOUTH":
    default:
      return ["YOUTH", "FAMILY"];
  }
}
