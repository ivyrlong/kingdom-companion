"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const AGE_GROUP_LABELS: Record<string, string> = {
  LITTLE_ONES: "Little Ones",
  YOUTH: "Youth",
  ADULT: "Adult",
  FAMILY: "Family",
};

interface GameCard {
  id: string;
  href: string;
  category: string;
  ageGroup: string;
  gameAgeGroup: string;
  title: string;
  description: string;
  imageUrl?: string | null;
}

interface GameTabsProps {
  evergreen: GameCard[];
  daily: GameCard[];
  meetingPrep: GameCard[];
  meetingLive: GameCard[];
  weekOffset: number;
  weekLabel: string;
  userAgeGroup: string;
}

const TABS = [
  { key: "daily", label: "Today" },
  { key: "evergreen", label: "All Games" },
  { key: "prep", label: "This Week" },
  { key: "live", label: "Meeting Live" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const EMPTY_MESSAGES: Record<TabKey, string> = {
  daily:
    "No daily text games today. An admin needs to publish today's Daily Text.",
  evergreen: "No games available yet. Check back soon!",
  prep: "No meeting preparation games this week. An admin needs to create content for this week.",
  live: "No meeting live games this week. Check back before your next meeting!",
};

function ageGroupColor(ageGroup: string): string {
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

export default function GameTabs({
  evergreen,
  daily,
  meetingPrep,
  meetingLive,
  weekOffset,
  weekLabel,
  userAgeGroup,
}: GameTabsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>(
    daily.length > 0 ? "daily" : "evergreen"
  );

  // Every tab shows all of its games to all visitors (no age filtering).
  const tabData: Record<TabKey, GameCard[]> = {
    daily,
    evergreen,
    prep: meetingPrep,
    live: meetingLive,
  };

  const cards = tabData[activeTab];
  const showWeekNav = activeTab === "prep" || activeTab === "live";

  const navigateWeek = (direction: -1 | 1) => {
    const newOffset = weekOffset + direction;
    router.push(newOffset === 0 ? "/games" : `/games?week=${newOffset}`);
  };

  return (
    <>
      {/* Age group indicator */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ageGroupColor(userAgeGroup)}`}>
          {AGE_GROUP_LABELS[userAgeGroup] ?? userAgeGroup}
        </span>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          Showing all games
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 mb-8 w-fit">
        {TABS.map((tab) => {
          const count = tabData[tab.key].length;
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
      {showWeekNav && (
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
              onClick={() => router.push("/games")}
              className="text-xs text-coral-600 dark:text-coral-400 hover:underline"
            >
              Back to this week
            </button>
          )}
        </div>
      )}

      {/* Cards */}
      {cards.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-500 dark:text-zinc-400 text-lg">
            {EMPTY_MESSAGES[activeTab]}
          </p>
        </div>
      ) : (
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
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ageGroupColor(card.gameAgeGroup)}`}>
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
      )}
    </>
  );
}
