"use client";

import { useState } from "react";
import GameCardGrid, { type GameCard } from "@/components/GameCardGrid";
import MyEncyclopedia, {
  type EncyclopediaItem,
} from "@/components/encyclopedia/MyEncyclopedia";

export default function ExploreTabs({
  games,
  encyclopediaItems,
}: {
  games: GameCard[];
  encyclopediaItems?: EncyclopediaItem[] | null;
}) {
  const hasEncyclopedia = !!encyclopediaItems;
  const [tab, setTab] = useState<"games" | "encyclopedia">("games");
  const isEnc = hasEncyclopedia && tab === "encyclopedia";

  const newCount = encyclopediaItems
    ? encyclopediaItems.filter((i) => i.collectedAt && !i.viewedAt).length
    : 0;

  // No encyclopedia for this age group — just the games, no tab bar needed.
  if (!hasEncyclopedia) {
    return games.length === 0 ? (
      <p className="text-center text-zinc-500 dark:text-zinc-400 text-lg py-12">
        No games available yet. Check back soon!
      </p>
    ) : (
      <GameCardGrid cards={games} />
    );
  }

  return (
    <>
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 mb-8 w-fit">
        <button
          onClick={() => setTab("games")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            !isEnc
              ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          All Games
          {games.length > 0 && (
            <span className="ml-1.5 text-xs opacity-60">({games.length})</span>
          )}
        </button>
        <button
          onClick={() => setTab("encyclopedia")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            isEnc
              ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          My Encyclopedia
          {newCount > 0 && (
            <span className="ml-1.5 text-xs bg-coral-600 text-white px-1.5 py-0.5 rounded-full">
              {newCount}
            </span>
          )}
        </button>
      </div>

      {isEnc ? (
        <MyEncyclopedia items={encyclopediaItems ?? []} />
      ) : games.length === 0 ? (
        <p className="text-center text-zinc-500 dark:text-zinc-400 text-lg py-12">
          No games available yet. Check back soon!
        </p>
      ) : (
        <GameCardGrid cards={games} />
      )}
    </>
  );
}
