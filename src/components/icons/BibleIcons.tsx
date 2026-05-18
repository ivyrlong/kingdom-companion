/**
 * Bible concept SVG icons for Kingdom Companion.
 * Designed for Little Ones — simple, colorful, recognizable shapes.
 * All icons accept className for sizing (default 24x24) and use palette colors.
 */

interface IconProps {
  className?: string;
  size?: number;
}

const d = (size: number) => ({ width: size, height: size, viewBox: "0 0 48 48", fill: "none", xmlns: "http://www.w3.org/2000/svg" });

// --- People & Characters ---

/** Simple person silhouette */
export function IconPerson({ className, size = 24 }: IconProps) {
  return (
    <svg {...d(size)} className={className}>
      <circle cx="24" cy="14" r="8" fill="#FF8269" />
      <path d="M10 44c0-7.7 6.3-14 14-14s14 6.3 14 14" fill="#FFD5B7" />
    </svg>
  );
}

/** King with crown */
export function IconKing({ className, size = 24 }: IconProps) {
  return (
    <svg {...d(size)} className={className}>
      <path d="M14 20h20l3-10-6 5-7-8-7 8-6-5 3 10z" fill="#F3B840" />
      <circle cx="24" cy="14" r="3" fill="#FF8269" />
      <rect x="14" y="20" width="20" height="4" rx="1" fill="#E5A320" />
      <path d="M12 28c0-2 2-4 12-4s12 2 12 4v12H12V28z" fill="#AC94F4" />
    </svg>
  );
}

/** Family group */
export function IconFamily({ className, size = 24 }: IconProps) {
  return (
    <svg {...d(size)} className={className}>
      <circle cx="16" cy="14" r="6" fill="#FF8269" />
      <circle cx="32" cy="14" r="6" fill="#75CFF0" />
      <circle cx="24" cy="26" r="5" fill="#F3B840" />
      <path d="M6 42c0-5.5 4.5-10 10-10 2 0 3.8.6 5.3 1.5" fill="#FFD5B7" />
      <path d="M42 42c0-5.5-4.5-10-10-10-2 0-3.8.6-5.3 1.5" fill="#D6F0FC" />
      <path d="M15 42c0-5 4-9 9-9s9 4 9 9" fill="#FEF3C7" />
    </svg>
  );
}

/** Shepherd with staff */
export function IconShepherd({ className, size = 24 }: IconProps) {
  return (
    <svg {...d(size)} className={className}>
      <circle cx="20" cy="12" r="7" fill="#FFD5B7" />
      <path d="M10 44c0-5.5 4.5-10 10-10s10 4.5 10 10" fill="#AC94F4" />
      <path d="M36 6c3 0 5 2 5 5v3h-2V11c0-1.7-1.3-3-3-3" stroke="#B43D28" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <line x1="36" y1="11" x2="36" y2="44" stroke="#B43D28" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// --- Animals ---

/** Dove (peace/holy spirit) */
export function IconDove({ className, size = 24 }: IconProps) {
  return (
    <svg {...d(size)} className={className}>
      <path d="M24 20c-6 0-10 4-14 8l6-2c2 4 6 6 10 6 6 0 12-4 14-10l-4 2c0-4-4-8-8-8" fill="white" stroke="#75CFF0" strokeWidth="2" />
      <path d="M10 28l-4-8 8 4" fill="#D6F0FC" />
      <circle cx="30" cy="22" r="1.5" fill="#3C3F4A" />
    </svg>
  );
}

/** Sheep/lamb */
export function IconSheep({ className, size = 24 }: IconProps) {
  return (
    <svg {...d(size)} className={className}>
      <ellipse cx="24" cy="28" rx="14" ry="10" fill="white" stroke="#D5C7FB" strokeWidth="2" />
      <circle cx="22" cy="22" r="3" fill="white" stroke="#D5C7FB" strokeWidth="1.5" />
      <circle cx="28" cy="20" r="3" fill="white" stroke="#D5C7FB" strokeWidth="1.5" />
      <circle cx="18" cy="18" r="2.5" fill="white" stroke="#D5C7FB" strokeWidth="1.5" />
      <ellipse cx="16" cy="30" rx="4" ry="6" fill="#FFD5B7" />
      <circle cx="14" cy="29" r="1.5" fill="#3C3F4A" />
      <line x1="18" y1="38" x2="18" y2="44" stroke="#3C3F4A" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="38" x2="24" y2="44" stroke="#3C3F4A" strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="38" x2="30" y2="44" stroke="#3C3F4A" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Fish (early Christian symbol) */
export function IconFish({ className, size = 24 }: IconProps) {
  return (
    <svg {...d(size)} className={className}>
      <path d="M8 24c8-12 22-12 32-6-10 0-18 2-22 6 4 4 12 6 22 6-10 6-24 6-32-6z" fill="#75CFF0" />
      <circle cx="34" cy="22" r="2" fill="white" />
      <circle cx="34.5" cy="21.5" r="1" fill="#3C3F4A" />
      <path d="M6 24l6-6v12l-6-6z" fill="#4ABDE8" />
    </svg>
  );
}

/** Lion */
export function IconLion({ className, size = 24 }: IconProps) {
  return (
    <svg {...d(size)} className={className}>
      <circle cx="24" cy="24" r="16" fill="#F3B840" />
      <circle cx="24" cy="26" r="11" fill="#FFD5B7" />
      <circle cx="20" cy="23" r="2" fill="#3C3F4A" />
      <circle cx="28" cy="23" r="2" fill="#3C3F4A" />
      <ellipse cx="24" cy="28" rx="3" ry="2" fill="#B43D28" />
      <path d="M21 30c1.5 2 4.5 2 6 0" stroke="#3C3F4A" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// --- Objects & Symbols ---

/** Bible/book */
export function IconBible({ className, size = 24 }: IconProps) {
  return (
    <svg {...d(size)} className={className}>
      <rect x="8" y="6" width="28" height="36" rx="3" fill="#AC94F4" />
      <rect x="10" y="8" width="24" height="32" rx="2" fill="white" />
      <path d="M22 14v10M17 19h10" stroke="#F3B840" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="15" y1="30" x2="31" y2="30" stroke="#D5C7FB" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="15" y1="34" x2="27" y2="34" stroke="#D5C7FB" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="8" y="6" width="4" height="36" rx="2" fill="#9474EF" />
    </svg>
  );
}

/** Scroll */
export function IconScroll({ className, size = 24 }: IconProps) {
  return (
    <svg {...d(size)} className={className}>
      <rect x="12" y="8" width="24" height="32" rx="1" fill="#FEF3C7" />
      <rect x="10" y="6" width="28" height="5" rx="2.5" fill="#F3B840" />
      <rect x="10" y="37" width="28" height="5" rx="2.5" fill="#F3B840" />
      <line x1="16" y1="16" x2="32" y2="16" stroke="#D4900A" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="21" x2="32" y2="21" stroke="#D4900A" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="26" x2="28" y2="26" stroke="#D4900A" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="31" x2="30" y2="31" stroke="#D4900A" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Prayer hands */
export function IconPrayer({ className, size = 24 }: IconProps) {
  return (
    <svg {...d(size)} className={className}>
      <path d="M24 8l-8 18c-1 2 0 4 2 5l6-3 6 3c2-1 3-3 2-5L24 8z" fill="#FFD5B7" />
      <line x1="24" y1="10" x2="24" y2="30" stroke="#FF8269" strokeWidth="1.5" />
      <path d="M16 36c2-2 5-3 8-3s6 1 8 3" stroke="#FFB5A5" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="16" cy="4" r="1.5" fill="#F3B840" />
      <circle cx="32" cy="4" r="1.5" fill="#F3B840" />
      <circle cx="10" cy="12" r="1.5" fill="#F3B840" />
      <circle cx="38" cy="12" r="1.5" fill="#F3B840" />
    </svg>
  );
}

/** Heart (love) */
export function IconHeart({ className, size = 24 }: IconProps) {
  return (
    <svg {...d(size)} className={className}>
      <path d="M24 42S6 30 6 18c0-6 5-11 11-11 4 0 7 2 7 2s3-2 7-2c6 0 11 5 11 11 0 12-18 24-18 24z" fill="#FF8269" />
    </svg>
  );
}

/** Star */
export function IconStar({ className, size = 24 }: IconProps) {
  return (
    <svg {...d(size)} className={className}>
      <path d="M24 4l6 14h14l-11 9 4 15-13-9-13 9 4-15L4 18h14z" fill="#F3B840" />
    </svg>
  );
}

/** Crown */
export function IconCrown({ className, size = 24 }: IconProps) {
  return (
    <svg {...d(size)} className={className}>
      <path d="M6 34l4-18 8 8 6-14 6 14 8-8 4 18H6z" fill="#F3B840" />
      <rect x="6" y="34" width="36" height="6" rx="2" fill="#E5A320" />
      <circle cx="16" cy="37" r="2" fill="#FF8269" />
      <circle cx="24" cy="37" r="2" fill="#AC94F4" />
      <circle cx="32" cy="37" r="2" fill="#75CFF0" />
    </svg>
  );
}

/** Rainbow (promise) */
export function IconRainbow({ className, size = 24 }: IconProps) {
  return (
    <svg {...d(size)} className={className}>
      <path d="M4 40c0-11 9-20 20-20s20 9 20 20" stroke="#FF8269" strokeWidth="4" fill="none" />
      <path d="M8 40c0-8.8 7.2-16 16-16s16 7.2 16 40" stroke="#F3B840" strokeWidth="4" fill="none" />
      <path d="M12 40c0-6.6 5.4-12 12-12s12 5.4 12 12" stroke="#75CFF0" strokeWidth="4" fill="none" />
      <path d="M16 40c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="#AC94F4" strokeWidth="4" fill="none" />
    </svg>
  );
}

/** Ark (Noah's ark) */
export function IconArk({ className, size = 24 }: IconProps) {
  return (
    <svg {...d(size)} className={className}>
      <path d="M4 32l4-4h32l4 4" stroke="#75CFF0" strokeWidth="3" fill="#ADE2FA" strokeLinecap="round" />
      <path d="M8 28h32v-6c0-2-2-4-4-4H12c-2 0-4 2-4 4v6z" fill="#B43D28" />
      <rect x="20" y="14" width="8" height="10" rx="1" fill="#FEF3C7" />
      <path d="M16 14l8-8 8 8" fill="#D95238" />
      <path d="M2 36c4-2 8 0 12-2s8 0 12-2 8 0 12-2 6 0 8 2" stroke="#75CFF0" strokeWidth="2" fill="none" />
      <path d="M2 40c4-2 8 0 12-2s8 0 12-2 8 0 12-2 6 0 8 2" stroke="#4ABDE8" strokeWidth="2" fill="none" />
    </svg>
  );
}

/** Tree (garden of Eden / tree of life) */
export function IconTree({ className, size = 24 }: IconProps) {
  return (
    <svg {...d(size)} className={className}>
      <rect x="21" y="28" width="6" height="16" rx="1" fill="#B43D28" />
      <circle cx="24" cy="18" r="14" fill="#4ABDE8" />
      <circle cx="18" cy="14" r="6" fill="#2AA8D8" />
      <circle cx="30" cy="16" r="5" fill="#2AA8D8" />
      <circle cx="24" cy="10" r="5" fill="#1C8BB8" />
      <circle cx="18" cy="22" r="3" fill="#FF8269" />
      <circle cx="28" cy="12" r="2.5" fill="#FF8269" />
    </svg>
  );
}

/** Water/waves (baptism, Red Sea) */
export function IconWater({ className, size = 24 }: IconProps) {
  return (
    <svg {...d(size)} className={className}>
      <path d="M2 20c4-4 8 0 12-4s8 0 12-4 8 0 12-4 6 0 8 4" stroke="#75CFF0" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M2 28c4-4 8 0 12-4s8 0 12-4 8 0 12-4 6 0 8 4" stroke="#4ABDE8" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M2 36c4-4 8 0 12-4s8 0 12-4 8 0 12-4 6 0 8 4" stroke="#1C8BB8" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** Mountain (Sinai, sermon on the mount) */
export function IconMountain({ className, size = 24 }: IconProps) {
  return (
    <svg {...d(size)} className={className}>
      <path d="M4 42l16-30 6 10 4-6 14 26H4z" fill="#AC94F4" />
      <path d="M20 12l-4 8 8 0z" fill="white" />
      <path d="M30 16l-2 4h8z" fill="#D5C7FB" />
      <circle cx="36" cy="10" r="5" fill="#F3B840" />
    </svg>
  );
}

/** Fire/flame (holy spirit, burning bush) */
export function IconFlame({ className, size = 24 }: IconProps) {
  return (
    <svg {...d(size)} className={className}>
      <path d="M24 4c-4 10-14 14-14 26 0 8 6 14 14 14s14-6 14-14c0-12-10-16-14-26z" fill="#FF8269" />
      <path d="M24 18c-2 6-7 8-7 16 0 4 3 7 7 7s7-3 7-7c0-8-5-10-7-16z" fill="#F3B840" />
      <path d="M24 30c-1 3-3 4-3 7 0 2 1.5 3.5 3 3.5s3-1.5 3-3.5c0-3-2-4-3-7z" fill="#FEF3C7" />
    </svg>
  );
}

/** Bread (manna, last supper) */
export function IconBread({ className, size = 24 }: IconProps) {
  return (
    <svg {...d(size)} className={className}>
      <ellipse cx="24" cy="30" rx="18" ry="10" fill="#FFD5B7" />
      <ellipse cx="24" cy="28" rx="16" ry="8" fill="#F3B840" />
      <path d="M14 26c2-1 4 1 6-1s4 1 6-1 4 1 4 1" stroke="#E5A320" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** Grapes/wine (fruit of the spirit, memorial) */
export function IconGrapes({ className, size = 24 }: IconProps) {
  return (
    <svg {...d(size)} className={className}>
      <path d="M24 4v8" stroke="#2AA8D8" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 6c-2-2-6-2-6 2" stroke="#2AA8D8" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <circle cx="18" cy="18" r="5" fill="#9474EF" />
      <circle cx="30" cy="18" r="5" fill="#9474EF" />
      <circle cx="24" cy="16" r="5" fill="#AC94F4" />
      <circle cx="15" cy="26" r="5" fill="#9474EF" />
      <circle cx="33" cy="26" r="5" fill="#9474EF" />
      <circle cx="24" cy="24" r="5" fill="#AC94F4" />
      <circle cx="21" cy="32" r="5" fill="#7C54EA" />
      <circle cx="27" cy="32" r="5" fill="#7C54EA" />
      <circle cx="24" cy="38" r="5" fill="#6539D4" />
    </svg>
  );
}

/** Temple/Kingdom Hall */
export function IconTemple({ className, size = 24 }: IconProps) {
  return (
    <svg {...d(size)} className={className}>
      <path d="M24 4l18 14H6L24 4z" fill="#75CFF0" />
      <rect x="8" y="18" width="32" height="24" fill="#FAF8F6" stroke="#D5C7FB" strokeWidth="2" />
      <rect x="20" y="28" width="8" height="14" rx="1" fill="#AC94F4" />
      <rect x="10" y="22" width="6" height="10" rx="1" fill="#D6F0FC" />
      <rect x="32" y="22" width="6" height="10" rx="1" fill="#D6F0FC" />
    </svg>
  );
}

/** Globe/earth (paradise) */
export function IconEarth({ className, size = 24 }: IconProps) {
  return (
    <svg {...d(size)} className={className}>
      <circle cx="24" cy="24" r="18" fill="#75CFF0" />
      <path d="M14 12c2 2 6 0 8 4s-2 6-4 8 4 6 8 4 6-4 8-2" fill="#4ABDE8" />
      <path d="M10 20c4-2 8 2 10 0s4 4 2 8-6 2-10 2" fill="#2AA8D8" />
      <circle cx="24" cy="24" r="18" fill="none" stroke="#4ABDE8" strokeWidth="1" />
    </svg>
  );
}

/** Light/lamp (truth, guidance) */
export function IconLamp({ className, size = 24 }: IconProps) {
  return (
    <svg {...d(size)} className={className}>
      <path d="M24 4l2 6h-4l2-6z" fill="#F3B840" />
      <circle cx="24" cy="20" r="10" fill="#FEF3C7" />
      <circle cx="24" cy="20" r="6" fill="#F3B840" />
      <rect x="20" y="30" width="8" height="4" rx="1" fill="#E5A320" />
      <rect x="22" y="34" width="4" height="6" rx="1" fill="#D4900A" />
      <line x1="10" y1="20" x2="4" y2="20" stroke="#F3B840" strokeWidth="2" strokeLinecap="round" />
      <line x1="38" y1="20" x2="44" y2="20" stroke="#F3B840" strokeWidth="2" strokeLinecap="round" />
      <line x1="14" y1="10" x2="10" y2="6" stroke="#F3B840" strokeWidth="2" strokeLinecap="round" />
      <line x1="34" y1="10" x2="38" y2="6" stroke="#F3B840" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Trumpet/horn (announcement, Jericho) */
export function IconTrumpet({ className, size = 24 }: IconProps) {
  return (
    <svg {...d(size)} className={className}>
      <path d="M6 22l20-6v16L6 26v-4z" fill="#F3B840" />
      <ellipse cx="28" cy="24" rx="4" ry="10" fill="#E5A320" />
      <circle cx="8" cy="24" r="3" fill="#E5A320" />
      <line x1="34" y1="16" x2="40" y2="12" stroke="#F3B840" strokeWidth="2" strokeLinecap="round" />
      <line x1="34" y1="24" x2="42" y2="24" stroke="#F3B840" strokeWidth="2" strokeLinecap="round" />
      <line x1="34" y1="32" x2="40" y2="36" stroke="#F3B840" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Upright stake (torture stake — no crossbar) */
export function IconStake({ className, size = 24 }: IconProps) {
  return (
    <svg {...d(size)} className={className}>
      <rect x="20" y="4" width="8" height="40" rx="2" fill="#B43D28" />
      <circle cx="24" cy="14" r="4" fill="#D95238" opacity="0.6" />
    </svg>
  );
}

/** Fruit (fruit of the spirit) */
export function IconFruit({ className, size = 24 }: IconProps) {
  return (
    <svg {...d(size)} className={className}>
      <path d="M24 8c-2-4-6-4-6-4s2 4 6 6c4-2 6-6 6-6s-4 0-6 4z" fill="#2AA8D8" />
      <ellipse cx="24" cy="28" rx="12" ry="14" fill="#FF8269" />
      <path d="M24 16c0 6-4 10-4 16" stroke="#D95238" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

/** Music note (singing, praise) */
export function IconMusic({ className, size = 24 }: IconProps) {
  return (
    <svg {...d(size)} className={className}>
      <circle cx="14" cy="36" r="6" fill="#AC94F4" />
      <circle cx="34" cy="32" r="6" fill="#AC94F4" />
      <rect x="18" y="8" width="4" height="28" rx="1" fill="#7C54EA" />
      <rect x="38" y="4" width="4" height="28" rx="1" fill="#7C54EA" />
      <rect x="18" y="6" width="24" height="6" rx="1" fill="#9474EF" />
    </svg>
  );
}

/** Treasure chest */
export function IconTreasure({ className, size = 24 }: IconProps) {
  return (
    <svg {...d(size)} className={className}>
      <rect x="6" y="22" width="36" height="18" rx="3" fill="#B43D28" />
      <path d="M6 22c0-8 8-14 18-14s18 6 18 14" fill="#D95238" />
      <rect x="6" y="20" width="36" height="4" rx="1" fill="#E5A320" />
      <rect x="20" y="26" width="8" height="8" rx="2" fill="#F3B840" />
      <circle cx="24" cy="30" r="2" fill="#E5A320" />
    </svg>
  );
}

/** Compass/direction (guidance) */
export function IconCompass({ className, size = 24 }: IconProps) {
  return (
    <svg {...d(size)} className={className}>
      <circle cx="24" cy="24" r="18" fill="#FAF8F6" stroke="#AC94F4" strokeWidth="2" />
      <circle cx="24" cy="24" r="14" fill="none" stroke="#D5C7FB" strokeWidth="1" />
      <path d="M24 10l4 14-4 4-4-4 4-14z" fill="#FF8269" />
      <path d="M24 38l-4-14 4-4 4 4-4 14z" fill="#75CFF0" />
      <circle cx="24" cy="24" r="3" fill="white" stroke="#AC94F4" strokeWidth="1.5" />
    </svg>
  );
}

// --- Lookup map for dynamic access ---

export const BIBLE_ICONS: Record<string, React.ComponentType<IconProps>> = {
  person: IconPerson,
  king: IconKing,
  family: IconFamily,
  shepherd: IconShepherd,
  dove: IconDove,
  sheep: IconSheep,
  fish: IconFish,
  lion: IconLion,
  bible: IconBible,
  scroll: IconScroll,
  prayer: IconPrayer,
  heart: IconHeart,
  star: IconStar,
  crown: IconCrown,
  rainbow: IconRainbow,
  ark: IconArk,
  tree: IconTree,
  water: IconWater,
  mountain: IconMountain,
  flame: IconFlame,
  bread: IconBread,
  grapes: IconGrapes,
  temple: IconTemple,
  earth: IconEarth,
  lamp: IconLamp,
  trumpet: IconTrumpet,
  stake: IconStake,
  fruit: IconFruit,
  music: IconMusic,
  treasure: IconTreasure,
  compass: IconCompass,
};

/** Get an icon component by keyword. Tries exact match, then partial. */
export function getIconForConcept(keyword: string): React.ComponentType<IconProps> | null {
  const lower = keyword.toLowerCase();

  // Direct match
  if (BIBLE_ICONS[lower]) return BIBLE_ICONS[lower];

  // Keyword mapping
  const KEYWORD_MAP: Record<string, string> = {
    jehovah: "star",
    god: "star",
    jesus: "shepherd",
    christ: "crown",
    moses: "mountain",
    david: "king",
    noah: "ark",
    abraham: "star",
    paul: "scroll",
    peter: "fish",
    ruth: "heart",
    esther: "crown",
    daniel: "lion",
    jonah: "fish",
    elijah: "flame",
    solomon: "temple",
    joshua: "trumpet",
    samson: "lion",
    sarah: "family",
    rahab: "heart",
    timothy: "scroll",
    job: "prayer",
    paradise: "earth",
    kingdom: "crown",
    creation: "earth",
    flood: "water",
    baptism: "water",
    sacrifice: "sheep",
    ransom: "sheep",
    faith: "lamp",
    hope: "rainbow",
    love: "heart",
    joy: "music",
    peace: "dove",
    kindness: "fruit",
    goodness: "fruit",
    patience: "tree",
    spirit: "dove",
    holy: "flame",
    angel: "star",
    heaven: "star",
    sin: "prayer",
    forgiveness: "heart",
    mercy: "heart",
    truth: "lamp",
    wisdom: "lamp",
    praise: "music",
    worship: "temple",
    song: "music",
    congregation: "temple",
    meeting: "temple",
    preach: "trumpet",
    witness: "scroll",
    ministry: "scroll",
    memorial: "bread",
    passover: "bread",
    manna: "bread",
    vine: "grapes",
    wine: "grapes",
    garden: "tree",
    eden: "tree",
    promised: "rainbow",
    covenant: "rainbow",
    law: "scroll",
    commandment: "scroll",
    tabernacle: "temple",
    pray: "prayer",
    shepherd: "shepherd",
    lamb: "sheep",
    flock: "sheep",
    treasure: "treasure",
    gift: "treasure",
    blessing: "star",
    servant: "person",
    disciple: "person",
    apostle: "person",
    prophet: "person",
    child: "family",
    children: "family",
    parent: "family",
  };

  // Try keyword map
  for (const [key, icon] of Object.entries(KEYWORD_MAP)) {
    if (lower.includes(key)) return BIBLE_ICONS[icon];
  }

  return null;
}
