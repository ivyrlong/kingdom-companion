"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import GameCardGrid, { type GameCard } from "@/components/GameCardGrid";
import WatchtowerStudyPanel, {
  type StudyQuestion,
  type SavedStudyResponse,
} from "@/components/WatchtowerStudyPanel";
import WorkbookPanel, {
  type WorkbookSection,
} from "@/components/WorkbookPanel";

interface StudyData {
  ageGroup: string;
  packId: string;
  title: string;
  imageUrl: string | null;
  questions: StudyQuestion[];
  scriptures: Array<{ reference: string; text: string }>;
  savedResponses: Record<number, SavedStudyResponse>;
  attribution: string | null;
  sourceUrl: string | null;
}

interface WorkbookData {
  ageGroup: string;
  packId: string;
  title: string;
  bibleReadingRange: { reference: string } | null;
  bibleReadingAssignment: { reference: string } | null;
  songs: number[];
  sections: WorkbookSection[];
  vocabulary: string[];
  attribution: string | null;
  sourceUrl: string | null;
}

const TABS = [
  { key: "prep", label: "This Week" },
  { key: "live", label: "Meeting Live" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

// The two weekly meetings. A meeting-week game card belongs to the midweek
// (Life & Ministry / OCLM) meeting or the weekend (Watchtower Study) meeting,
// decided by its content source. The Watchtower study panel only belongs to
// the weekend meeting.
const MEETINGS = [
  { key: "OCLM", label: "Life & Ministry" },
  { key: "WATCHTOWER", label: "Watchtower Study" },
] as const;
type MeetingKey = (typeof MEETINGS)[number]["key"];

function cardMeeting(c: GameCard): MeetingKey {
  return c.source === "OCLM" ? "OCLM" : "WATCHTOWER";
}

export default function MeetingTabs({
  prep,
  live,
  weekOffset,
  weekLabel,
  study,
  workbook,
}: {
  prep: GameCard[];
  live: GameCard[];
  weekOffset: number;
  weekLabel: string;
  study?: StudyData | null;
  workbook?: WorkbookData | null;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("prep");

  const all = [...prep, ...live];
  const hasWatchtower =
    !!study || all.some((c) => cardMeeting(c) === "WATCHTOWER");
  const hasOclm =
    !!workbook || all.some((c) => cardMeeting(c) === "OCLM");
  // Land on whichever meeting actually has content; if both, default to the
  // weekend meeting (it carries the study panel).
  const [meeting, setMeeting] = useState<MeetingKey>(
    hasOclm && !hasWatchtower ? "OCLM" : "WATCHTOWER",
  );

  const byMeeting = (cards: GameCard[]) =>
    cards.filter((c) => cardMeeting(c) === meeting);

  const data: Record<TabKey, GameCard[]> = {
    prep: byMeeting(prep),
    live: byMeeting(live),
  };
  const cards = data[activeTab];
  const showStudy = meeting === "WATCHTOWER" && !!study;
  const showWorkbook = meeting === "OCLM" && !!workbook;
  const meetingLabel = MEETINGS.find((m) => m.key === meeting)?.label ?? "";

  const navigateWeek = (direction: -1 | 1) => {
    const newOffset = weekOffset + direction;
    router.push(newOffset === 0 ? "/meeting" : `/meeting?week=${newOffset}`);
  };

  return (
    <>
      {/* Phase tabs */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 mb-3 w-fit">
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

      {/* Which meeting */}
      <div className="flex flex-col gap-1 mb-6">
        <span className="text-xs font-medium text-zinc-400">
          Which meeting?
        </span>
        <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 w-fit">
          {MEETINGS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMeeting(m.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                meeting === m.key
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
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

      {/* Watchtower study — weekend meeting only. Same pack/answers in both
          tabs, so Meeting Live resumes whatever was prepared this week. */}
      {showStudy && study && (
        <WatchtowerStudyPanel
          ageGroup={study.ageGroup}
          packId={study.packId}
          title={study.title}
          imageUrl={study.imageUrl}
          questions={study.questions}
          scriptures={study.scriptures}
          savedResponses={study.savedResponses}
          attribution={study.attribution}
          sourceUrl={study.sourceUrl}
          live={activeTab === "live"}
        />
      )}

      {/* OCLM workbook — midweek meeting only. Same imported outline drives
          both tabs; per-part notes persist across the prep → live handoff. */}
      {showWorkbook && workbook && (
        <WorkbookPanel
          ageGroup={workbook.ageGroup}
          packId={workbook.packId}
          title={workbook.title}
          bibleReadingRange={workbook.bibleReadingRange}
          bibleReadingAssignment={workbook.bibleReadingAssignment}
          songs={workbook.songs}
          sections={workbook.sections}
          vocabulary={workbook.vocabulary}
          attribution={workbook.attribution}
          sourceUrl={workbook.sourceUrl}
          live={activeTab === "live"}
        />
      )}

      {/* Body */}
      {cards.length === 0 ? (
        showStudy || showWorkbook ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No extra {activeTab === "live" ? "meeting" : "preparation"} games
            for this meeting yet — the {showStudy ? "study" : "workbook"} above
            is ready.
          </p>
        ) : (
          <div className="text-center py-12">
            <p className="text-zinc-500 dark:text-zinc-400 text-lg">
              No {meetingLabel}{" "}
              {activeTab === "live" ? "meeting" : "preparation"} content for
              this week yet.{" "}
              {activeTab === "live"
                ? "Check back before your next meeting!"
                : "An admin needs to add this week's content."}
            </p>
          </div>
        )
      ) : (
        <GameCardGrid cards={cards} />
      )}
    </>
  );
}
