"use client";

/**
 * MeetingTabs — top of the /meeting page.
 *
 * Historical shape had two "phase" tabs (This Week / Meeting Live) that
 * switched the panels' `live` prop. Playtest feedback: tab-switching every
 * meeting was the wrong ergonomic. The phase tabs are gone; each panel
 * (WorkbookPanel, WatchtowerStudyPanel) now self-manages a study↔live mode
 * with a Save button (study→live) and an Edit link (live→study). Games
 * for the current meeting always render at the bottom regardless of mode.
 */

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

  // Games for the current meeting — both prep-time and live-time cards
  // show together at the bottom regardless of mode, so kids don't have
  // to switch tabs to find the "listen for these" game while the meeting
  // is happening.
  const meetingGames = [...byMeeting(prep), ...byMeeting(live)];
  const showStudy = meeting === "WATCHTOWER" && !!study;
  const showWorkbook = meeting === "OCLM" && !!workbook;
  const meetingLabel = MEETINGS.find((m) => m.key === meeting)?.label ?? "";

  const navigateWeek = (direction: -1 | 1) => {
    const newOffset = weekOffset + direction;
    router.push(newOffset === 0 ? "/meeting" : `/meeting?week=${newOffset}`);
  };

  return (
    <>
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

      {/* Watchtower study — weekend meeting only. Panel self-manages a
          study ↔ live mode with its own Save / Edit toggle. */}
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
        />
      )}

      {/* OCLM workbook — midweek meeting only. Panel self-manages the
          study ↔ live mode with its own Save / Edit toggle. */}
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
        />
      )}

      {/* Games for this meeting — always shown at the bottom regardless
          of the panel's mode, so listening / bingo cards are one scroll
          away during the actual meeting. */}
      {meetingGames.length === 0 ? (
        showStudy || showWorkbook ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No extra games for this meeting yet — the {showStudy ? "study" : "workbook"} above is ready.
          </p>
        ) : (
          <div className="text-center py-12">
            <p className="text-zinc-500 dark:text-zinc-400 text-lg">
              No {meetingLabel} content for this week yet. An admin needs to add this week's content.
            </p>
          </div>
        )
      ) : (
        <>
          <h3 className="mt-6 mb-3 text-sm font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide">
            Games for this meeting
          </h3>
          <GameCardGrid cards={meetingGames} />
        </>
      )}
    </>
  );
}
