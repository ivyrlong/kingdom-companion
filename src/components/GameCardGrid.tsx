import Link from "next/link";

export interface GameCard {
  id: string;
  href: string;
  category: string;
  ageGroup: string; // display label
  gameAgeGroup: string; // raw enum value, for colour
  title: string;
  description: string;
  imageUrl?: string | null;
  // Content source (e.g. "WATCHTOWER" | "OCLM"), used on the Meeting page to
  // split cards by which meeting they belong to. Optional elsewhere.
  source?: string;
}

export const AGE_GROUP_LABELS: Record<string, string> = {
  LITTLE_ONES: "Little Ones",
  YOUTH: "Youth",
  ADULT: "Adult",
  FAMILY: "Family",
};

export function ageGroupColor(ageGroup: string): string {
  switch (ageGroup) {
    case "LITTLE_ONES":
      return "bg-sky-100 dark:bg-sky-300/20 text-sky-700 dark:text-sky-300";
    case "YOUTH":
      return "bg-violet-100 dark:bg-violet-300/20 text-violet-700 dark:text-violet-300";
    case "ADULT":
      return "bg-golden-100 dark:bg-golden-300/20 text-golden-600 dark:text-golden-300";
    case "FAMILY":
      return "bg-peach-100 dark:bg-peach-300/20 text-peach-500 dark:text-peach-300";
    default:
      return "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400";
  }
}

export default function GameCardGrid({ cards }: { cards: GameCard[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card) => (
        <Link
          key={card.id}
          href={card.href}
          className="group bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col hover:shadow-lg hover:border-coral-300 dark:hover:border-coral-700 transition"
        >
          <div className="aspect-[2/1] w-full overflow-hidden bg-gradient-to-br from-coral-100 via-peach-100 to-sky-100 dark:from-zinc-800 dark:via-zinc-800 dark:to-zinc-800 flex items-center justify-center">
            {card.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.imageUrl}
                alt=""
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <span className="text-4xl font-bold text-coral-400/70 dark:text-zinc-600 select-none">
                {card.title.charAt(0)}
              </span>
            )}
          </div>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-medium bg-coral-50 dark:bg-coral-900/30 text-coral-700 dark:text-coral-300 px-2 py-1 rounded-full">
                {card.category}
              </span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${ageGroupColor(card.gameAgeGroup)}`}
              >
                {AGE_GROUP_LABELS[card.gameAgeGroup] ?? card.ageGroup}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 group-hover:text-coral-600 dark:group-hover:text-coral-400 transition mb-2">
              {card.title}
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              {card.description}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
