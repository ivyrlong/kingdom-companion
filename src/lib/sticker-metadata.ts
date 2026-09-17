/**
 * Parse a sticker filename into auto-fill metadata.
 *
 * The strict filename convention documented in `prompts/sticker-prompts.md`
 * lets the upload UI (and the API) infer kind / variant / role without a
 * manual pass. Every field returned here is a best-guess default — every
 * field in the upload form is still editable so an oddly-named file still
 * works.
 *
 * Convention:
 *   sticker-people-<variant>-<role-slug>.png     → PERSON
 *   sticker-animals-<a>-<b>.png                  → ANIMAL_PAIR
 *   sticker-animals-<name>.png                   → ANIMAL_SOLO
 *   sticker-plants-<name>.png                    → PLANT
 *   sticker-homes-<name>.png                     → HOME
 *   sticker-sky-<name>.png                       → SKY
 */

export type StickerKindSlug =
  | "PERSON"
  | "BIBLE_CHARACTER"
  | "ANIMAL_PAIR"
  | "ANIMAL_SOLO"
  | "PLANT"
  | "HOME"
  | "SKY";

export interface StickerFilenameGuess {
  /** Best-guess kind. */
  kind: StickerKindSlug;
  /** Everything after "sticker-<category>-", minus extension. Used as a slug seed. */
  subject: string;
  /** For PERSON only: parsed variant (blonde / brunette / black / hispanic / asian). */
  variant?: string;
  /** For PERSON only: parsed role slug (grandmother / teen-girl / child-boy / ...). */
  role?: string;
  /** Suggested display name — Title-Cased subject. */
  suggestedName: string;
  /** Suggested slug — kebab-cased subject. */
  suggestedSlug: string;
}

const VALID_VARIANTS = new Set([
  "blonde",
  "brunette",
  "black",
  "hispanic",
  "asian",
]);

const VALID_ROLES = new Set([
  "grandmother",
  "grandfather",
  "mother",
  "father",
  "teen-girl",
  "teen-boy",
  "child-girl",
  "child-boy",
]);

function stripExtension(filename: string): string {
  return filename.replace(/\.[a-z0-9]+$/i, "");
}

function toTitleCase(slug: string): string {
  // "lion-lamb" → "Lion & Lamb"; "dove" → "Dove"; "grape-vine" → "Grape Vine".
  // Pairs read best with "&" between the two subjects.
  const parts = slug.split("-").filter(Boolean);
  const titled = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1));
  if (titled.length === 2 && parts.every((p) => /^[a-z]+$/.test(p))) {
    // Ambiguous — "grape-vine" is 2 words too. Prefer & only when both words
    // look like whole subjects; when in doubt, join with a space.
    // The caller is free to edit.
    return titled.join(" ");
  }
  return titled.join(" ");
}

/**
 * Guess metadata from a filename. Returns null if the filename doesn't
 * follow the `sticker-<category>-…` convention at all.
 */
export function guessStickerFromFilename(
  filename: string,
): StickerFilenameGuess | null {
  const base = stripExtension(filename).toLowerCase();
  const parts = base.split("-");
  if (parts[0] !== "sticker" || parts.length < 3) return null;

  const category = parts[1];
  const rest = parts.slice(2);

  switch (category) {
    case "people": {
      // Expect: <variant>-<role...> where role is 1 or 2 tokens.
      const variant = rest[0];
      if (!VALID_VARIANTS.has(variant)) return null;

      const remainder = rest.slice(1).join("-");
      const role = VALID_ROLES.has(remainder) ? remainder : undefined;

      // Slug uses only variant+role — the actual character name comes from
      // the DB match (Emma Miller etc.).
      const subject = rest.join("-");
      return {
        kind: "PERSON",
        subject,
        variant,
        role,
        suggestedName: toTitleCase(subject),
        suggestedSlug: subject,
      };
    }
    case "bible": {
      // sticker-bible-<slug>.png — Bible character (Moses, Ruth, David, ...).
      // Slug is the character's name in kebab-case; may contain hyphens
      // (e.g. "john-the-baptizer").
      const subject = rest.join("-");
      return {
        kind: "BIBLE_CHARACTER",
        subject,
        suggestedName: toTitleCase(subject),
        suggestedSlug: subject,
      };
    }
    case "animals": {
      const subject = rest.join("-");
      // Two-token subjects treated as pairs (lion-lamb, wolf-kid, leopard-calf,
      // bear-cow, child-cobra). Single-token = solo.
      const kind: StickerKindSlug = rest.length >= 2 ? "ANIMAL_PAIR" : "ANIMAL_SOLO";
      const name =
        kind === "ANIMAL_PAIR"
          ? rest.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" & ")
          : toTitleCase(subject);
      return {
        kind,
        subject,
        suggestedName: name,
        suggestedSlug: subject,
      };
    }
    case "plants":
      return kindResult("PLANT", rest);
    case "homes":
      return kindResult("HOME", rest);
    case "sky":
      return kindResult("SKY", rest);
    default:
      return null;
  }
}

function kindResult(kind: StickerKindSlug, rest: string[]): StickerFilenameGuess {
  const subject = rest.join("-");
  return {
    kind,
    subject,
    suggestedName: toTitleCase(subject),
    suggestedSlug: subject,
  };
}
