"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import GameCardGrid, { type GameCard } from "@/components/GameCardGrid";

const TABS = [
  { key: "prep", label: "This Week" },
  { key: "live", label: "Meeting Live" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const EMPTY: Record<TabKey, string> = {
  prep: "No meeting preparation games for this week yet. An admin needs to add this week's content.",
  live: "No meeting live games for this week yet. Check back before your next meeting!",
};

export default function MeetingTabs({
  prep,
  live,
  weekOffset,
  weekLabel,
}: {
  prep: GameCard[];
  live: GameCard[];
  weekOffset: number;
  weekLabel: string;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("prep");

  const data: Record<TabKey, GameCard[]> = { prep, live };
  const cards = data[activeTab];

  const navigateWeek = (direction: -1 | 1) => {
    const newOffset = weekOffset + direction;
    router.push(newOffset === 0 ? "/meeting" : `/meeting?week=${newOffset}`);
  };

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 mb-6 w-fit">
        {TABS.map((tab) => {
          const count = data[tab.key].length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                activeTab === tab.key
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className="ml-1.5 text-xs opacity-60">({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigateWeek(-1)}
          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition"
          aria-label="Previous week"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {weekLabel}
        </span>
        <button
          onClick={() => navigateWeek(1)}
          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition"
          aria-label="Next week"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
        {weekOffset !== 0 && (
          <button
            onClick={() => router.push("/meeting")}
            className="text-xs text-coral-600 dark:text-coral-400 hover:underline"
          >
            Back to this week
          </button>
        )}
      </div>

      {/* Body */}
      {cards.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-500 dark:text-zinc-400 text-lg">
            {EMPTY[activeTab]}
          </p>
        </div>
      ) : (
        <GameCardGrid cards={cards} />
      )}
    </>
  );
}
