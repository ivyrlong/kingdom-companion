"use client";

import { useState } from "react";
import DailyTextForm from "./DailyTextForm";
import DailyTextBulk from "./DailyTextBulk";

interface ScriptureEntry {
  reference: string;
  text: string;
}

interface ReferenceEntry {
  type: "scripture" | "publication" | "crossArticle" | "footnote" | "internal";
  label: string;
  url?: string;
  scriptureRef?: string;
}

interface QuestionEntry {
  question: string;
  answer: string;
  // Watchtower study (optional): kid-level answer + comment-building word
  // bank + multiple-choice options. Pictures are assigned after saving.
  simplifiedAnswer?: string;
  keyWords?: string[];
  options: string[];
  // WOL import (optional): section subheading + outgoing reference links.
  subheading?: string;
  references?: ReferenceEntry[];
}

type Step = "paste" | "review" | "done";

export default function ContentIngestion() {
  const [step, setStep] = useState<Step>("paste");
  const [dailyMode, setDailyMode] = useState<"single" | "bulk">("single");
  const [sourceText, setSourceText] = useState("");
  const [title, setTitle] = useState("");
  const [source, setSource] = useState<
    "WATCHTOWER" | "OCLM" | "EVERGREEN" | "DAILY_TEXT"
  >("WATCHTOWER");
  const [context, setContext] = useState<
    "EVERGREEN" | "MEETING_PREP" | "MEETING_LIVE"
  >("MEETING_PREP");
  const [weekOf, setWeekOf] = useState("");

  // Extracted content (editable)
  const [vocabulary, setVocabulary] = useState<string[]>([]);
  const [scriptures, setScriptures] = useState<ScriptureEntry[]>([]);
  const [keyPeople, setKeyPeople] = useState<string[]>([]);
  const [themes, setThemes] = useState<string[]>([]);
  const [questions, setQuestions] = useState<QuestionEntry[]>([]);
  const [keyPhrases, setKeyPhrases] = useState<string[]>([]);

  // WOL-imported metadata (only set when the pack came from a wol.jw.org
  // article — passes through to /api/admin/content-packs at publish time).
  const [issueLabel, setIssueLabel] = useState<string | undefined>(undefined);
  const [articleNumber, setArticleNumber] = useState<number | undefined>(
    undefined,
  );
  const [themeScripture, setThemeScripture] = useState<
    { reference: string } | undefined
  >(undefined);
  const [sourceUrl, setSourceUrl] = useState<string | undefined>(undefined);
  const [sourceDocId, setSourceDocId] = useState<string | undefined>(undefined);
  const [attribution, setAttribution] = useState<string | undefined>(undefined);

  // WOL URL importer state
  const [wolUrl, setWolUrl] = useState("");
  const [importing, setImporting] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /**
   * Import a Watchtower study article from a wol.jw.org URL. Calls the
   * server-side importer (which discards body prose) and pre-fills every
   * review field so the admin only needs to type their own-words paragraph
   * answers + simplified-for-kids answers + verify the extracted data.
   */
  const handleWolImport = async () => {
    if (!wolUrl.trim()) return;
    setImporting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/wol-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: wolUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");

      // Top-level pack fields
      setTitle(data.title ?? "");
      setSource("WATCHTOWER");
      setContext("MEETING_PREP");
      setIssueLabel(data.issueLabel);
      setArticleNumber(data.articleNumber);
      setThemeScripture(data.themeScripture);
      setSourceUrl(data.sourceUrl);
      setSourceDocId(data.sourceDocId);
      setAttribution(data.attribution);

      // Derived / structural fields
      setVocabulary(data.vocabulary ?? []);
      setScriptures(data.scriptures ?? []);
      setKeyPeople(data.keyPeople ?? []);
      setThemes(data.themes ?? []);
      setKeyPhrases(data.keyPhrases ?? []);
      setQuestions(
        (data.questions ?? []).map(
          (q: {
            question: string;
            subheading?: string;
            references?: ReferenceEntry[];
          }) => ({
            question: q.question,
            answer: "",
            simplifiedAnswer: "",
            keyWords: [],
            options: [],
            subheading: q.subheading,
            references: q.references ?? [],
          }),
        ),
      );
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleParse = async () => {
    if (!sourceText.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sourceText }),
      });

      if (!res.ok) throw new Error("Parse failed");

      const data = await res.json();
      setVocabulary(data.vocabulary || []);
      setScriptures(
        (data.scriptures || []).map((ref: string) => ({
          reference: ref,
          text: "",
        }))
      );
      setKeyPeople(data.keyPeople || []);
      setKeyPhrases(data.keyPhrases || []);
      setQuestions(
        (data.questions || []).map((q: string) => ({
          question: q,
          answer: "",
          simplifiedAnswer: "",
          keyWords: [],
          options: [],
        }))
      );
      setStep("review");
    } catch {
      setError("Failed to parse text. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    setLoading(true);
    setError("");

    try {
      // Create meeting week if applicable
      let meetingWeekId: string | undefined;
      if (weekOf && source !== "EVERGREEN") {
        const weekRes = await fetch("/api/admin/meeting-weeks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weekOf,
            title: `Week of ${new Date(weekOf).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
          }),
        });
        if (weekRes.ok) {
          const week = await weekRes.json();
          meetingWeekId = week.id;
        }
      }

      const res = await fetch("/api/admin/content-packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          source,
          context,
          sourceText,
          vocabulary,
          scriptures,
          keyPeople,
          themes,
          questions,
          keyPhrases,
          meetingWeekId,
          generateInstances: true,
          // WOL metadata — only sent if this pack was URL-imported
          ...(issueLabel ? { issueLabel } : {}),
          ...(articleNumber !== undefined ? { articleNumber } : {}),
          ...(themeScripture ? { themeScripture } : {}),
          ...(sourceUrl ? { sourceUrl } : {}),
          ...(sourceDocId ? { sourceDocId } : {}),
          ...(attribution ? { attribution } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create content pack");
      }

      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to publish");
    } finally {
      setLoading(false);
    }
  };

  const addToList = (
    list: string[],
    setList: (v: string[]) => void,
    item: string,
  ) => {
    if (item.trim() && !list.includes(item.trim())) {
      setList([...list, item.trim()]);
    }
  };

  // Reorder helper for the per-question Up/Down buttons. Order matters
  // for the Watchtower study flow and during the meeting.
  const moveQuestion = (from: number, to: number) => {
    if (to < 0 || to >= questions.length) return;
    const next = [...questions];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setQuestions(next);
  };

  // ─── Step: Paste ───────────────────────────────────────────────────

  if (step === "paste") {
    const isDaily = source === "DAILY_TEXT";
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {!isDaily && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. WT Study — April 6"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-coral-500"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Source
            </label>
            <select
              value={source}
              onChange={(e) =>
                setSource(e.target.value as typeof source)
              }
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-coral-500"
            >
              <option value="WATCHTOWER">Watchtower Study</option>
              <option value="OCLM">Life & Ministry Workbook</option>
              <option value="EVERGREEN">Evergreen (General)</option>
              <option value="DAILY_TEXT">Daily Text</option>
            </select>
          </div>
          {!isDaily && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Game Context
              </label>
              <select
                value={context}
                onChange={(e) =>
                  setContext(e.target.value as typeof context)
                }
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-coral-500"
              >
                <option value="MEETING_PREP">Meeting Preparation</option>
                <option value="MEETING_LIVE">Meeting Live</option>
                <option value="EVERGREEN">Evergreen</option>
              </select>
            </div>
          )}
        </div>

        {isDaily ? (
          <div className="space-y-6">
            <div className="flex gap-2">
              {(["single", "bulk"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDailyMode(m)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                    dailyMode === m
                      ? "bg-coral-600 border-coral-600 text-white"
                      : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-coral-400"
                  }`}
                >
                  {m === "single" ? "Single entry" : "Bulk upload (CSV)"}
                </button>
              ))}
            </div>
            {dailyMode === "single" ? <DailyTextForm /> : <DailyTextBulk />}
          </div>
        ) : (
          <>
            {source !== "EVERGREEN" && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Week Of (Monday)
                </label>
                <input
                  type="date"
                  value={weekOf}
                  onChange={(e) => setWeekOf(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-coral-500"
                />
              </div>
            )}

            {/* WOL URL importer — fastest path for Watchtower articles.
                Body prose is never persisted; only structure, citations,
                and derived data (vocab, people, themes, key phrases). */}
            {source === "WATCHTOWER" && (
              <div className="rounded-xl border border-violet-200 dark:border-violet-900/40 bg-violet-50 dark:bg-violet-900/10 p-4 space-y-2">
                <label className="block text-sm font-medium text-violet-900 dark:text-violet-200">
                  Import from WOL URL{" "}
                  <span className="text-xs font-normal text-violet-700/70 dark:text-violet-300/70">
                    (fastest — pulls title, scriptures, references, and
                    extracted vocabulary in one shot)
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="url"
                    value={wolUrl}
                    onChange={(e) => setWolUrl(e.target.value)}
                    placeholder="https://wol.jw.org/wol/d/r1/lp-e/…"
                    className="flex-1 min-w-[280px] px-3 py-2 rounded-lg border border-violet-300 dark:border-violet-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleWolImport}
                    disabled={importing || !wolUrl.trim()}
                    className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 dark:disabled:bg-violet-900 text-white text-sm font-medium transition"
                  >
                    {importing ? "Importing…" : "Import"}
                  </button>
                </div>
                <p className="text-xs text-violet-700/80 dark:text-violet-300/70">
                  Paste a canonical /wol/d/ URL. You&apos;ll still type
                  your own-words answers + simplified-for-kids on the next
                  step. Body prose stays at WOL — only metadata is stored.
                </p>
                {sourceUrl && (
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    ✓ Imported from {sourceUrl}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Paste Article Text{" "}
                {source === "WATCHTOWER" && (
                  <span className="text-xs font-normal text-zinc-400">
                    (optional fallback — use the URL importer above when
                    possible)
                  </span>
                )}
              </label>
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                rows={12}
                placeholder="Paste the Watchtower Study article or OCLM workbook text here..."
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-coral-500 font-mono text-sm"
              />
            </div>

            {error && (
              <div className="text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleParse}
              disabled={loading || !title.trim() || !sourceText.trim()}
              className="px-6 py-2.5 bg-coral-600 hover:bg-coral-700 disabled:bg-coral-400 text-white font-medium rounded-lg transition"
            >
              {loading ? "Extracting..." : "Extract Content"}
            </button>
          </>
        )}
      </div>
    );
  }

  // ─── Step: Done ────────────────────────────────────────────────────

  if (step === "done") {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Content Pack Published
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 mb-6">
          Game instances have been auto-generated for compatible games.
        </p>
        <button
          onClick={() => {
            setStep("paste");
            setSourceText("");
            setTitle("");
            setVocabulary([]);
            setScriptures([]);
            setKeyPeople([]);
            setThemes([]);
            setQuestions([]);
            setKeyPhrases([]);
            setIssueLabel(undefined);
            setArticleNumber(undefined);
            setThemeScripture(undefined);
            setSourceUrl(undefined);
            setSourceDocId(undefined);
            setAttribution(undefined);
            setWolUrl("");
          }}
          className="px-6 py-2.5 bg-coral-600 hover:bg-coral-700 text-white font-medium rounded-lg transition"
        >
          Create Another
        </button>
      </div>
    );
  }

  // ─── Step: Review ──────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Review Extracted Content
        </h2>
        <button
          onClick={() => setStep("paste")}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Back to Paste
        </button>
      </div>

      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Review what was extracted. Add, remove, or edit items before publishing.
        The more content you include, the more games will be generated.
      </p>

      {/* Vocabulary */}
      <EditableListSection
        title="Vocabulary"
        description={`${vocabulary.length} terms — used for Word Search`}
        items={vocabulary}
        onRemove={(i) => setVocabulary(vocabulary.filter((_, idx) => idx !== i))}
        onAdd={(item) => addToList(vocabulary, setVocabulary, item)}
      />

      {/* Scriptures */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
          Scriptures
        </h3>
        <p className="text-xs text-zinc-400 mb-3">
          {scriptures.length} references — used for Scripture Match, Name That
          Scripture
        </p>
        <div className="space-y-2 mb-3">
          {scriptures.map((s, i) => (
            <div key={i} className="flex gap-2 items-start">
              <input
                value={s.reference}
                onChange={(e) => {
                  const updated = [...scriptures];
                  updated[i] = { ...updated[i], reference: e.target.value };
                  setScriptures(updated);
                }}
                className="w-40 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm"
                placeholder="Reference"
              />
              <input
                value={s.text}
                onChange={(e) => {
                  const updated = [...scriptures];
                  updated[i] = { ...updated[i], text: e.target.value };
                  setScriptures(updated);
                }}
                className="flex-1 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm"
                placeholder="Verse text (optional)"
              />
              <button
                onClick={() =>
                  setScriptures(scriptures.filter((_, idx) => idx !== i))
                }
                className="text-red-400 hover:text-red-600 text-sm px-1"
              >
                x
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() =>
            setScriptures([
              ...scriptures,
              { reference: "", text: "" },
            ])
          }
          className="text-sm text-coral-600 hover:text-coral-700"
        >
          + Add scripture
        </button>
      </div>

      {/* Key People */}
      <EditableListSection
        title="Key People"
        description={`${keyPeople.length} names — used for Who Am I?`}
        items={keyPeople}
        onRemove={(i) => setKeyPeople(keyPeople.filter((_, idx) => idx !== i))}
        onAdd={(item) => addToList(keyPeople, setKeyPeople, item)}
      />

      {/* Themes */}
      <EditableListSection
        title="Themes"
        description={`${themes.length} themes`}
        items={themes}
        onRemove={(i) => setThemes(themes.filter((_, idx) => idx !== i))}
        onAdd={(item) => addToList(themes, setThemes, item)}
      />

      {/* Key Phrases */}
      <EditableListSection
        title="Key Phrases"
        description={`${keyPhrases.length} phrases — used for Meeting Bingo, Tap When You Hear`}
        items={keyPhrases}
        onRemove={(i) =>
          setKeyPhrases(keyPhrases.filter((_, idx) => idx !== i))
        }
        onAdd={(item) => addToList(keyPhrases, setKeyPhrases, item)}
      />

      {/* Questions */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
          Questions
        </h3>
        <p className="text-xs text-zinc-400 mb-3">
          {source === "WATCHTOWER"
            ? `${questions.length} questions — power the Meeting → Watchtower Study. Enter answers by hand; auto-parsing is unreliable.`
            : `${questions.length} questions — used for Trivia`}
        </p>
        <div className="space-y-3 mb-3">
          {questions.map((q, i) => {
            const patch = (p: Partial<QuestionEntry>) => {
              const updated = [...questions];
              updated[i] = { ...updated[i], ...p };
              setQuestions(updated);
            };
            return (
              <div
                key={i}
                className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 space-y-2"
              >
                <div className="flex gap-2">
                  <textarea
                    value={q.question}
                    onChange={(e) => patch({ question: e.target.value })}
                    rows={source === "WATCHTOWER" ? 2 : 1}
                    className="flex-1 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                    placeholder="Question"
                  />
                  <div className="flex flex-col gap-0.5 self-start">
                    <button
                      type="button"
                      onClick={() => moveQuestion(i, i - 1)}
                      disabled={i === 0}
                      aria-label="Move question up"
                      title="Move up"
                      className="w-7 h-7 flex items-center justify-center text-sm rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-700 dark:hover:text-zinc-100 disabled:text-zinc-300 dark:disabled:text-zinc-700 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveQuestion(i, i + 1)}
                      disabled={i === questions.length - 1}
                      aria-label="Move question down"
                      title="Move down"
                      className="w-7 h-7 flex items-center justify-center text-sm rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-700 dark:hover:text-zinc-100 disabled:text-zinc-300 dark:disabled:text-zinc-700 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setQuestions(questions.filter((_, idx) => idx !== i))
                      }
                      aria-label="Delete question"
                      title="Delete"
                      className="w-7 h-7 flex items-center justify-center text-sm rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <textarea
                  value={q.answer}
                  onChange={(e) => patch({ answer: e.target.value })}
                  rows={source === "WATCHTOWER" ? 2 : 1}
                  className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                  placeholder={
                    source === "WATCHTOWER"
                      ? "Paragraph answer (leave blank for a personal/discussion question)"
                      : "Answer"
                  }
                />
                {source === "WATCHTOWER" && (
                  <>
                    <textarea
                      value={q.simplifiedAnswer ?? ""}
                      onChange={(e) =>
                        patch({ simplifiedAnswer: e.target.value })
                      }
                      rows={2}
                      className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                      placeholder="Simplified answer for Little Ones (blank = hidden from Little Ones)"
                    />
                    <input
                      value={(q.keyWords ?? []).join(", ")}
                      onChange={(e) =>
                        patch({
                          keyWords: e.target.value
                            .split(",")
                            .map((w) => w.trim())
                            .filter(Boolean),
                        })
                      }
                      className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                      placeholder="Key words, comma-separated (optional — auto-filled from the answer if blank)"
                    />
                    <textarea
                      value={(q.options ?? []).join("\n")}
                      onChange={(e) =>
                        patch({
                          options: e.target.value
                            .split("\n")
                            .map((o) => o.trim())
                            .filter(Boolean),
                        })
                      }
                      rows={3}
                      className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                      placeholder="Multiple-choice options, one per line (optional — auto-built if blank)"
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
        {source === "WATCHTOWER" && (
          <p className="text-xs text-zinc-400 mb-3">
            Little Ones pictures are assigned per question after saving: use
            the <span className="font-medium">Images</span> button on the pack,
            then pick a picture for each question in{" "}
            <span className="font-medium">Edit</span>.
          </p>
        )}
        <button
          onClick={() =>
            setQuestions([
              ...questions,
              {
                question: "",
                answer: "",
                simplifiedAnswer: "",
                keyWords: [],
                options: [],
              },
            ])
          }
          className="text-sm text-coral-600 hover:text-coral-700"
        >
          + Add question
        </button>
      </div>

      {error && (
        <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handlePublish}
          disabled={loading}
          className="px-6 py-2.5 bg-coral-600 hover:bg-coral-700 disabled:bg-coral-400 text-white font-medium rounded-lg transition"
        >
          {loading ? "Publishing..." : "Publish Content Pack"}
        </button>
        <button
          onClick={() => setStep("paste")}
          className="px-6 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition"
        >
          Back
        </button>
      </div>
    </div>
  );
}

// ─── Reusable editable list section ────────────────────────────────────

function EditableListSection({
  title,
  description,
  items,
  onRemove,
  onAdd,
}: {
  title: string;
  description: string;
  items: string[];
  onAdd: (item: string) => void;
  onRemove: (index: number) => void;
}) {
  const [value, setValue] = useState("");

  const handleAdd = () => {
    if (value.trim()) {
      onAdd(value.trim());
      setValue("");
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
        {title}
      </h3>
      <p className="text-xs text-zinc-400 mb-3">{description}</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {items.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-coral-50 dark:bg-coral-900/20 text-coral-700 dark:text-coral-300 rounded-lg text-sm"
          >
            {item}
            <button
              onClick={() => onRemove(i)}
              className="text-coral-400 hover:text-red-500 ml-0.5"
            >
              x
            </button>
          </span>
        ))}
        {items.length === 0 && (
          <span className="text-sm text-zinc-400">None found — add manually</span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="flex-1 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm"
          placeholder={`Add ${title.toLowerCase()}...`}
        />
        <button
          onClick={handleAdd}
          className="text-sm text-coral-600 hover:text-coral-700 px-2"
        >
          Add
        </button>
      </div>
    </div>
  );
}
