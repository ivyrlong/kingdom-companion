import { z } from "zod";

/**
 * Shared Zod schemas for the /api/admin/content-packs routes.
 *
 * The underscore-prefix directory makes Next.js skip this as a route
 * segment, so importing from here doesn't expose a public endpoint.
 *
 * Lives next to the routes that consume it — both POST and PATCH
 * accept the same per-question + reference shape, so duplicating
 * them in two files just invites drift.
 */

export const referenceSchema = z.object({
  type: z.enum([
    "scripture",
    "publication",
    "crossArticle",
    "footnote",
    "internal",
  ]),
  label: z.string(),
  url: z.string().optional(),
  scriptureRef: z.string().optional(),
});

export const questionSchema = z.object({
  question: z.string(),
  answer: z.string().default(""),
  // Watchtower study: kid-level answer + comment-building word bank +
  // an optional per-question picture for the Little Ones reveal.
  simplifiedAnswer: z.string().default(""),
  keyWords: z.array(z.string()).default([]),
  options: z.array(z.string()).default([]),
  imageUrl: z.string().default(""),
  // WOL import: section subheading + outgoing reference links.
  subheading: z.string().optional(),
  references: z.array(referenceSchema).default([]),
});

/**
 * OCLM workbook part — one row in the meeting agenda.
 * Mirrors `WorkbookPart` in lib/wol-import.ts.
 */
export const workbookPartSchema = z.object({
  number: z.number().int().optional(),
  kind: z.enum([
    "song",
    "openingComments",
    "talk",
    "spiritualGems",
    "bibleReading",
    "ministryConversation",
    "returnVisit",
    "ministryDemo",
    "ministryTalk",
    "bibleStudy",
    "livingTalk",
    "livingDiscussion",
    "cbs",
    "concludingComments",
  ]),
  section: z.enum(["OPENING", "TREASURES", "MINISTRY", "LIVING", "CLOSING"]),
  title: z.string(),
  durationMin: z.number().int().optional(),
  scenarioTag: z.string().optional(),
  songNumber: z.number().int().optional(),
  videoUrl: z.string().optional(),
  videoTitle: z.string().optional(),
  references: z.array(referenceSchema).default([]),
  promptQuestions: z.array(z.string()).default([]),
  // Optional AI-generated insights for this part (populated by the
  // /api/admin/oclm-insights endpoint after import).
  aiContent: z
    .object({
      kidSummary: z.string(),
      familyDiscussionQuestion: z.string(),
      listeningPhrases: z.array(z.string()),
    })
    .optional(),
});

export const oclmSectionSchema = z.object({
  kind: z.enum(["OPENING", "TREASURES", "MINISTRY", "LIVING", "CLOSING"]),
  title: z.string(),
  parts: z.array(workbookPartSchema),
});
