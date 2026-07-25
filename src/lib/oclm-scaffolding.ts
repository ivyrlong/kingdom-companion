/**
 * Templated study-guide scaffolding for the OCLM (Life & Ministry) workbook.
 *
 * The WOL import only gives us structural metadata per part — title, kind,
 * duration, references, italic prompt questions. That's a great agenda, but
 * it's not a study guide. This module adds per-audience prep prompts keyed
 * by part *kind* (bibleReading, initialCall, cbs, livingTalk, …) so every
 * imported week gets real content depth without per-week authoring.
 *
 * Design constraints:
 *   • Copyright-safe — no reprinting of body prose or NWT text. Prompts are
 *     generic-per-kind and derived from format, not the article's content.
 *   • Doctrine-safe — prompts nudge the reader toward personal application
 *     and the JW study format; they never assert scriptural interpretation.
 *   • JW-audience — no cross imagery (see feedback_no_crosses); use lamb /
 *     sheep / upright-stake vocabulary if imagery is ever added.
 *   • Age-tiered — Little Ones get a single "listen for" cue, Youth get
 *     conversational prep questions, Adults get outline + application angles.
 */

import type { OclmPartKind } from "./wol-import";

export interface PartScaffold {
  /** One-line audience-neutral orientation shown under the part title. */
  focus: string;
  /** Little Ones cue: something concrete to listen or watch for. */
  little?: string;
  /** Youth prep prompts (1–3). */
  youthPrompts: string[];
  /** Adult prep prompts (1–3). */
  adultPrompts: string[];
}

const SCAFFOLDS: Partial<Record<OclmPartKind, PartScaffold>> = {
  bibleReading: {
    focus: "The student reads the assignment aloud with clear expression.",
    little: "Listen for a Bible name when it's read out loud.",
    youthPrompts: [
      "Read the assignment out loud twice this week — which words are hard?",
      "What's happening in this chapter? Who is speaking, and to whom?",
    ],
    adultPrompts: [
      "Read the assignment aloud, pausing at commas. Note any pronunciation hints in the *lmd* or *th* study aid.",
      "Which single point in the passage would you emphasize by tone of voice?",
    ],
  },

  ministryConversation: {
    focus: "First-contact ministry — starting a Bible-based conversation.",
    little: "Listen for how the speaker starts talking with someone new.",
    youthPrompts: [
      "Picture a real neighbor or classmate. What Bible thought would you share with them?",
      "How would you keep the conversation friendly and unhurried?",
    ],
    adultPrompts: [
      "Note the scenario (household, place, time of day). How does it shape the approach?",
      "What Bible verse anchors the opening thought? What follow-up would you leave with?",
    ],
  },

  returnVisit: {
    focus: "Return visit — continuing a conversation started earlier.",
    little: "Listen for a Bible verse that follows up on last time.",
    youthPrompts: [
      "What was left unfinished last time? What Bible thought could you bring back?",
      "How would you show the person you were listening?",
    ],
    adultPrompts: [
      "Identify the promised follow-up: verse, question, or thought. How does it build on the opening call?",
      "Where does the demo pivot from review → new material → invitation? Note the transition.",
    ],
  },

  ministryDemo: {
    focus: "A demonstration in the field ministry setting.",
    little: "Listen for a Bible verse being read to the person.",
    youthPrompts: [
      "What is being demonstrated? A start, a follow-up, or a Bible study step?",
      "How could you use this in your own ministry?",
    ],
    adultPrompts: [
      "Identify the demo's purpose and its intended teaching point.",
      "Where does the presenter transition from question → Scripture → application? Note the pivot.",
    ],
  },

  bibleStudy: {
    focus: "Conducting a home Bible study — teach one specific point.",
    little: "Listen for a paragraph or scripture being read out loud.",
    youthPrompts: [
      "What one truth does this part focus on? How would you explain it in your own words?",
      "What question would you ask to check the student understood?",
    ],
    adultPrompts: [
      "Trace the paragraph flow: question → main point → scripture → application. Where does the demo model deeper conversation?",
      "What tie-in from earlier study material strengthens the point?",
    ],
  },

  ministryTalk: {
    focus: "Ministry talk — practicing a specific presentation.",
    little: "Listen for a story or example you can picture.",
    youthPrompts: [
      "What's the one Bible point of this talk? How would you say it in a sentence?",
      "How could you use this the next time you go out in service?",
    ],
    adultPrompts: [
      "Outline the talk in 2–3 points. Which scriptures anchor each?",
      "How would you adapt this for someone unfamiliar with Bible terms?",
    ],
  },

  livingTalk: {
    focus: "Applying Bible principles to Christian living.",
    little: "Listen for the video if there is one — or a story about a family.",
    youthPrompts: [
      "What is the one main point of this talk? Say it in one sentence.",
      "What could you do this week to apply it?",
    ],
    adultPrompts: [
      "As you listen, outline 3 main points. Note one experience or scripture you could share when leading a discussion.",
      "How could you apply this in family worship this week?",
    ],
  },

  livingDiscussion: {
    focus: "Congregation-wide discussion led by an elder.",
    little: "Listen for hands going up — someone giving an answer.",
    youthPrompts: [
      "What answer would you raise your hand to give?",
      "Which experience or scripture would you contribute?",
    ],
    adultPrompts: [
      "Read the cited material beforehand. What one experience have you seen that illustrates the point?",
      "Prepare a 30-second comment tied to a specific verse.",
    ],
  },

  cbs: {
    focus: "Congregation Bible Study — a set section of the current book.",
    little: "Listen for a paragraph number being read out loud.",
    youthPrompts: [
      "Read the paragraphs before the meeting. Which scripture stood out to you?",
      "What one comment could you prepare to raise your hand for?",
    ],
    adultPrompts: [
      "Outline the main points paragraph-by-paragraph. Note the cited scriptures that anchor each.",
      "What real experience or application illustrates the key point? Prepare it in advance.",
    ],
  },

  talk: {
    focus: "A 10-minute talk on the week's Bible reading.",
    little: "Listen for a Bible person's name or a place.",
    youthPrompts: [
      "What is the one lesson the speaker wants you to remember?",
      "Which scripture from the reading anchors the point?",
    ],
    adultPrompts: [
      "Identify the outline (usually 3 main points). Note the cited scriptures and how each supports the theme.",
      "How does the theme tie into the whole week's Bible reading?",
    ],
  },

  spiritualGems: {
    focus: "Two audience-answered questions from the week's Bible reading.",
    little: "Listen for a hand going up when a question is asked.",
    youthPrompts: [
      "Read the assigned chapters ahead of time. What answer would you give to each question?",
      "Which verse would you cite in your answer?",
    ],
    adultPrompts: [
      "Prepare a 30-second comment for each of the two questions, tied to a specific verse.",
      "What less-obvious angle from the chapters could you contribute?",
    ],
  },

  concludingComments: {
    focus: "The chairman ties the meeting together and previews next week.",
    adultPrompts: [
      "Note the announcements and songs for next week.",
      "What one point from tonight will you carry into your week?",
    ],
    youthPrompts: [
      "Write down one thing you learned tonight.",
    ],
  },

  openingComments: {
    focus: "The chairman welcomes and previews the meeting theme.",
    adultPrompts: [
      "Note the theme scripture — how does it thread through the parts?",
    ],
    youthPrompts: [
      "Listen for the theme — what will tonight be about?",
    ],
  },
};

const DEFAULT_SCAFFOLD: PartScaffold = {
  focus: "A meeting part on the week's theme.",
  youthPrompts: [
    "What's the main point of this part?",
    "How would you apply it this week?",
  ],
  adultPrompts: [
    "Identify the main point and its supporting scripture.",
    "How would you apply this at home this week?",
  ],
};

/**
 * Look up the scaffold for a part kind. Songs, prayers, and any unknown
 * kinds return `null` — the caller should render nothing rather than an
 * empty prompt block.
 */
export function scaffoldFor(kind: OclmPartKind): PartScaffold | null {
  if (kind === "song") return null;
  return SCAFFOLDS[kind] ?? DEFAULT_SCAFFOLD;
}
