/**
 * Hidden-object puzzle generator.
 *
 * Given a scene and a pool of stickers, generate a busy scene of
 * placements plus a target list. Camouflage is layered on:
 *   - varied scale (bigger + smaller so nothing has a "default" hunt)
 *   - overlap (any sticker can peek from behind another — z-order is
 *     just array position)
 *   - multiple copies of the same slug (find 2/3 of X)
 *   - optional CSS-filter tint per placement so some blend slightly
 *     with the scene's colour ground
 *
 * Pure function — no I/O, no React. `random` is injectable so tests
 * can supply a seeded RNG; production callers pass Math.random.
 */

export type StickerKindSlug =
  | "PERSON"
  | "ANIMAL_PAIR"
  | "ANIMAL_SOLO"
  | "PLANT"
  | "HOME"
  | "SKY";

export interface StickerLite {
  slug: string;
  name: string;
  kind: StickerKindSlug;
  path: string;
  altText: string;
}

export interface Tint {
  hueRotateDeg: number; // -30..30
  brightness: number; // 0.85..1.10
  saturation: number; // 0.85..1.15
  opacity: number; // 0.80..1.00
}

export interface Placement {
  id: string;
  stickerSlug: string;
  x: number; // 0..1 (centre)
  y: number; // 0..1 (centre)
  scale: number; // 0.5..1.4 (multiplier of BASE size)
  rotation?: number; // degrees, -8..8 for subtle tilt
  tint?: Tint;
}

export interface Target {
  slug: string;
  displayName: string;
  requiredCount: number;
  /** Cached path for the target's icon in the sidebar. */
  iconPath: string;
}

export interface Puzzle {
  placements: Placement[];
  targets: Target[];
}

// ── Config ────────────────────────────────────────────────────────────

const PLACEMENT_COUNT = 30; // total stickers on the canvas
const DISTINCT_SLUG_COUNT = 15; // distinct sticker types used
const TARGET_COUNT = 10;
const MULTI_COUNT_TARGETS = 3; // of the 10, this many are "find N of X"

const SCALE_MIN = 0.5;
const SCALE_MAX = 1.4;

const ROTATION_MAX_DEG = 8;

const TINT_PROBABILITY = 0.55; // half the placements get tinted
const HUE_ROTATE_MAX = 30;

// Where placements can land (leave margin from edges so nothing gets clipped).
const X_MIN = 0.06;
const X_MAX = 0.94;
const Y_MIN = 0.10;
const Y_MAX = 0.90;

// ── Utils ─────────────────────────────────────────────────────────────

type RNG = () => number;

function pick<T>(arr: readonly T[], rng: RNG): T {
  return arr[Math.floor(rng() * arr.length)];
}

function randRange(lo: number, hi: number, rng: RNG): number {
  return lo + rng() * (hi - lo);
}

function shuffle<T>(arr: readonly T[], rng: RNG): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makeId(rng: RNG): string {
  return `p_${Math.floor(rng() * 1e9).toString(36)}`;
}

function maybeTint(rng: RNG): Tint | undefined {
  if (rng() > TINT_PROBABILITY) return undefined;
  return {
    hueRotateDeg: Math.round(randRange(-HUE_ROTATE_MAX, HUE_ROTATE_MAX, rng)),
    brightness: Number(randRange(0.88, 1.08, rng).toFixed(2)),
    saturation: Number(randRange(0.85, 1.15, rng).toFixed(2)),
    opacity: Number(randRange(0.85, 1.0, rng).toFixed(2)),
  };
}

// ── Generator ────────────────────────────────────────────────────────

export function generatePuzzle(
  stickerPool: readonly StickerLite[],
  rng: RNG = Math.random,
): Puzzle {
  if (stickerPool.length === 0) {
    return { placements: [], targets: [] };
  }

  // Pick the distinct sticker types this puzzle will use. Fewer types
  // = more repeat copies per type, which makes "find 3 of X" targets
  // possible. Prefer variety across kinds so the sidebar reads well.
  const distinctPool = pickDistinctStickers(
    stickerPool,
    Math.min(DISTINCT_SLUG_COUNT, stickerPool.length),
    rng,
  );

  // Distribute PLACEMENT_COUNT placements across the distinct pool.
  // Weight so a handful of slugs get multiple copies (candidates for
  // multi-count targets), the rest get 1-2.
  const slugCounts = distributeCopies(distinctPool.length, PLACEMENT_COUNT, rng);

  const placements: Placement[] = [];
  for (let i = 0; i < distinctPool.length; i++) {
    const sticker = distinctPool[i];
    const copies = slugCounts[i];
    for (let c = 0; c < copies; c++) {
      placements.push({
        id: makeId(rng),
        stickerSlug: sticker.slug,
        x: Number(randRange(X_MIN, X_MAX, rng).toFixed(4)),
        y: Number(randRange(Y_MIN, Y_MAX, rng).toFixed(4)),
        scale: Number(randRange(SCALE_MIN, SCALE_MAX, rng).toFixed(3)),
        rotation:
          rng() < 0.5
            ? Number(randRange(-ROTATION_MAX_DEG, ROTATION_MAX_DEG, rng).toFixed(1))
            : undefined,
        tint: maybeTint(rng),
      });
    }
  }

  // Shuffle placements so paint order isn't grouped by slug (better
  // overlap distribution).
  const shuffled = shuffle(placements, rng);

  // Targets: pick 10 slugs from the pool. `MULTI_COUNT_TARGETS` of
  // them require finding 2-3 copies each; the rest just 1.
  const targets = pickTargets(distinctPool, slugCounts, rng);

  return { placements: shuffled, targets };
}

/**
 * Pick N distinct stickers weighted toward variety across kinds so the
 * target list reads like a natural mix (person + animal + plant + …).
 */
function pickDistinctStickers(
  pool: readonly StickerLite[],
  n: number,
  rng: RNG,
): StickerLite[] {
  const byKind = new Map<StickerKindSlug, StickerLite[]>();
  for (const s of pool) {
    const bucket = byKind.get(s.kind) ?? [];
    bucket.push(s);
    byKind.set(s.kind, bucket);
  }
  // Round-robin one from each kind bucket (shuffled) until we hit n
  // or exhaust every bucket.
  const shuffledBuckets = new Map<StickerKindSlug, StickerLite[]>();
  for (const [k, v] of byKind) shuffledBuckets.set(k, shuffle(v, rng));

  const chosen: StickerLite[] = [];
  const kinds = Array.from(shuffledBuckets.keys());
  while (chosen.length < n) {
    let picked = false;
    for (const kind of kinds) {
      if (chosen.length >= n) break;
      const bucket = shuffledBuckets.get(kind);
      if (bucket && bucket.length > 0) {
        chosen.push(bucket.shift()!);
        picked = true;
      }
    }
    if (!picked) break; // every bucket empty
  }
  return chosen;
}

/**
 * Given `slugCount` distinct slugs and `totalCopies` placements to
 * distribute, return a copy count per slug. Some slugs get 3-4 copies
 * (candidates for "find 3 of X"), rest get 1-2.
 */
function distributeCopies(slugCount: number, totalCopies: number, rng: RNG): number[] {
  const counts = new Array<number>(slugCount).fill(1); // everyone gets at least 1
  let remaining = totalCopies - slugCount;
  // Give ~4-5 slugs extra copies to create multi-count opportunities.
  const heavyIndices = shuffle(
    Array.from({ length: slugCount }, (_, i) => i),
    rng,
  ).slice(0, Math.min(5, slugCount));
  for (const idx of heavyIndices) {
    if (remaining <= 0) break;
    const extra = Math.min(2 + Math.floor(rng() * 2), remaining); // +2 or +3
    counts[idx] += extra;
    remaining -= extra;
  }
  // Sprinkle the rest 1 at a time.
  while (remaining > 0) {
    const idx = Math.floor(rng() * slugCount);
    counts[idx]++;
    remaining--;
  }
  return counts;
}

function pickTargets(
  pool: readonly StickerLite[],
  slugCounts: readonly number[],
  rng: RNG,
): Target[] {
  // Rank slugs by copy count desc — the top ones are eligible for
  // multi-count targets.
  const ranked = pool
    .map((s, i) => ({ sticker: s, copies: slugCounts[i] }))
    .filter((row) => row.copies > 0);
  const multiEligible = ranked.filter((r) => r.copies >= 2);
  const singleEligible = ranked.filter((r) => r.copies >= 1);

  const targets: Target[] = [];
  const usedSlugs = new Set<string>();

  // First pick multi-count targets. Take up to MULTI_COUNT_TARGETS
  // from slugs with 2+ copies. Ask for (copies) or (copies-1) — never
  // more than actually placed.
  const multi = shuffle(multiEligible, rng).slice(0, MULTI_COUNT_TARGETS);
  for (const m of multi) {
    if (targets.length >= TARGET_COUNT) break;
    const requested = Math.min(m.copies, 2 + Math.floor(rng() * 2)); // 2 or 3
    targets.push({
      slug: m.sticker.slug,
      displayName: m.sticker.name,
      requiredCount: requested,
      iconPath: m.sticker.path,
    });
    usedSlugs.add(m.sticker.slug);
  }

  // Fill the rest with single-count targets from unused slugs.
  const singles = shuffle(
    singleEligible.filter((r) => !usedSlugs.has(r.sticker.slug)),
    rng,
  );
  for (const s of singles) {
    if (targets.length >= TARGET_COUNT) break;
    targets.push({
      slug: s.sticker.slug,
      displayName: s.sticker.name,
      requiredCount: 1,
      iconPath: s.sticker.path,
    });
    usedSlugs.add(s.sticker.slug);
  }

  return targets;
}

/** Build the CSS filter string for a placement's tint. */
export function tintToCssFilter(tint: Tint | undefined): string | undefined {
  if (!tint) return undefined;
  return `hue-rotate(${tint.hueRotateDeg}deg) brightness(${tint.brightness}) saturate(${tint.saturation})`;
}
