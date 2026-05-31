/**
 * Content Parser — extracts structured data from pasted article text.
 * No external API needed. Uses regex patterns and word lists.
 */

// ─── Scripture Reference Detection ─────────────────────────────────────

const BIBLE_BOOK_PATTERNS = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
  "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
  "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles",
  "Ezra", "Nehemiah", "Esther", "Job", "Psalms?",
  "Proverbs", "Ecclesiastes", "Song of Solomon",
  "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel",
  "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah",
  "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
  "Matthew", "Mark", "Luke", "John", "Acts",
  "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
  "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians",
  "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews",
  "James", "1 Peter", "2 Peter", "1 John", "2 John",
  "3 John", "Jude", "Revelation",
];

const SCRIPTURE_REGEX = new RegExp(
  `(?:${BIBLE_BOOK_PATTERNS.join("|")})\\s+\\d+(?::\\d+(?:[\\s,;-]+\\d+)*)?`,
  "gi"
);

export function extractScriptures(text: string): string[] {
  const matches = text.match(SCRIPTURE_REGEX) || [];
  // Deduplicate
  return [...new Set(matches.map((s) => s.trim()))];
}

// ─── Bible Character Detection ─────────────────────────────────────────

const BIBLE_CHARACTERS = [
  "Adam", "Eve", "Noah", "Abraham", "Sarah", "Isaac", "Rebekah",
  "Jacob", "Esau", "Joseph", "Moses", "Aaron", "Miriam", "Joshua",
  "Rahab", "Deborah", "Gideon", "Samson", "Ruth", "Naomi", "Boaz",
  "Hannah", "Samuel", "Saul", "David", "Solomon", "Elijah", "Elisha",
  "Jonah", "Isaiah", "Jeremiah", "Ezekiel", "Daniel", "Esther",
  "Mordecai", "Nehemiah", "Ezra", "Job", "Hosea", "Joel", "Amos",
  "Obadiah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai",
  "Zechariah", "Malachi", "Jesus", "Peter", "John", "James", "Paul",
  "Barnabas", "Timothy", "Titus", "Philemon", "Mary", "Martha",
  "Lazarus", "Stephen", "Philip", "Cornelius", "Lydia", "Priscilla",
  "Aquila", "Apollos", "Silas", "Luke", "Mark", "Matthew",
  "Judas", "Thomas", "Andrew", "Nathanael", "Nicodemus",
  "Zacchaeus", "Pilate", "Herod", "Pharaoh", "Nebuchadnezzar",
  "Hezekiah", "Josiah", "Manasseh", "Jehoshaphat", "Asa",
  "Lot", "Melchizedek", "Balaam", "Balak", "Caleb",
  "Abigail", "Bathsheba", "Delilah", "Jezebel", "Potiphar",
  "Goliath", "Absalom", "Jonathan", "Mephibosheth",
];

export function extractKeyPeople(text: string): string[] {
  const found: string[] = [];
  for (const name of BIBLE_CHARACTERS) {
    // Word boundary match, case-sensitive
    const regex = new RegExp(`\\b${name}\\b`);
    if (regex.test(text)) {
      found.push(name);
    }
  }
  return found;
}

// ─── Vocabulary Extraction ─────────────────────────────────────────────

// Common JW/Bible vocabulary worth highlighting
const THEOCRATIC_TERMS = [
  "Jehovah", "Kingdom", "congregation", "ministry", "pioneer",
  "anointed", "great crowd", "paradise", "resurrection", "ransom",
  "sovereignty", "integrity", "endurance", "faith", "hope",
  "love", "righteousness", "sanctification", "dedication", "baptism",
  "memorial", "Nisan", "Governing Body", "circuit overseer",
  "elder", "ministerial servant", "publisher", "study",
  "Watchtower", "Awake", "Bible study", "return visit",
  "field service", "preaching", "territory", "assembly",
  "convention", "Kingdom Hall", "Bethel", "Gilead",
  "new personality", "fruitage of the spirit", "holy spirit",
  "meekness", "self-control", "goodness", "kindness",
  "patience", "mildness", "faithfulness", "peace", "joy",
  "tribulation", "Armageddon", "Babylon the Great",
  "new world", "last days", "sign of the times",
  "faithful and discreet slave", "other sheep",
  "spiritual food", "theocratic", "Gehenna", "Sheol",
  "Hades", "promised land", "covenant", "commandment",
  "sacrifice", "atonement", "propitiation", "redemption",
];

export function extractVocabulary(text: string): string[] {
  const found: string[] = [];
  const lowerText = text.toLowerCase();

  for (const term of THEOCRATIC_TERMS) {
    if (lowerText.includes(term.toLowerCase())) {
      found.push(term);
    }
  }

  return found;
}

// ─── Key Phrases (for Meeting Bingo / Tap games) ───────────────────────

/**
 * Extracts quoted phrases and short distinctive phrases from text.
 * These work well as "listen for this" items in meeting games.
 */
export function extractKeyPhrases(text: string): string[] {
  const phrases: string[] = [];

  // Extract quoted phrases (both single and double quotes)
  const quoteMatches = text.match(/[""\u201C\u201D]([^""\u201C\u201D]{5,60})[""\u201C\u201D]/g) || [];
  for (const match of quoteMatches) {
    phrases.push(match.replace(/[""\u201C\u201D]/g, "").trim());
  }

  // Extract text in bold markers (if markdown-ish)
  const boldMatches = text.match(/\*\*([^*]{3,50})\*\*/g) || [];
  for (const match of boldMatches) {
    phrases.push(match.replace(/\*\*/g, "").trim());
  }

  return [...new Set(phrases)];
}

// ─── Question Generation (pattern-based, Watchtower-aware) ─────────────

/**
 * Matches a Watchtower paragraph-number marker at the start of a paragraph:
 * "1.", "1, 2.", "4-6.", "7–9." (en/em-dash), followed by whitespace.
 */
const PARAGRAPH_MARKER = /^\s*\d+(?:\s*[,\-–—]\s*\d+)*\.\s+/;

/**
 * Splits a question block on sub-question markers like "(a)", "(b)", "(i)",
 * keeping each marker as the prefix of its part. Used so "(a) ...? (b) ...?"
 * becomes two separate questions instead of one combined string.
 */
function splitSubQuestions(text: string): string[] {
  const re = /\((?:[a-h]|[ivx]+)\)/gi;
  const positions: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) positions.push(m.index);
  if (positions.length === 0) return [text];

  const parts: string[] = [];
  if (positions[0] > 0) {
    const lead = text.slice(0, positions[0]).trim();
    if (lead) parts.push(lead); // lead-in before "(a)" sometimes carries the stem
  }
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i];
    const end = i + 1 < positions.length ? positions[i + 1] : text.length;
    parts.push(text.slice(start, end).trim());
  }
  return parts;
}

/**
 * Extracts paragraph questions from pasted Watchtower-style text.
 *
 * Two complementary passes, in source order:
 *  1. Paragraph-aware: for each blank-line-separated paragraph that starts
 *     with a paragraph-number marker, collapse line wraps and pull every
 *     sentence ending in "?". Splits (a)/(b)/(c) sub-questions into separate
 *     entries. Catches questions that wrap across lines (the most common
 *     reason the old line-only parser missed them).
 *  2. Line fallback for un-numbered text: any line ending in "?".
 *
 * Deduped case-insensitively. Min 8 chars (keeps trivial "Why?" out without
 * dropping short genuine questions).
 */
export function extractQuestions(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (raw: string) => {
    const t = raw.replace(/\s+/g, " ").trim();
    if (t.length < 8 || t.length > 300) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(t);
  };

  for (const rawPara of text.split(/\n\s*\n/)) {
    const para = rawPara.replace(/\s+/g, " ").trim();
    if (!para) continue;

    if (PARAGRAPH_MARKER.test(para)) {
      // Numbered Watchtower-style paragraph question block.
      const body = para.replace(PARAGRAPH_MARKER, "");
      for (const part of splitSubQuestions(body)) {
        const matches = part.match(/[^?]+\?/g) || [];
        for (const sentence of matches) push(sentence);
      }
    } else {
      // Un-numbered: any line ending in "?" counts.
      for (const line of rawPara.split(/\n/)) {
        const t = line.trim();
        if (!t.endsWith("?")) continue;
        push(t.replace(/^[\d.,)\-*•\s]+/, ""));
      }
    }
  }

  return out;
}

// ─── Full Parse ────────────────────────────────────────────────────────

export interface ParsedContent {
  scriptures: string[];
  keyPeople: string[];
  vocabulary: string[];
  keyPhrases: string[];
  questions: string[];
}

export function parseArticleText(text: string): ParsedContent {
  return {
    scriptures: extractScriptures(text),
    keyPeople: extractKeyPeople(text),
    vocabulary: extractVocabulary(text),
    keyPhrases: extractKeyPhrases(text),
    questions: extractQuestions(text),
  };
}

// ─── Daily Text Parse ──────────────────────────────────────────────────

export interface ParsedDailyText {
  vocabulary: string[];
  keyPeople: string[];
  themes: string[];
  questions: string[];
  keyPhrases: string[];
}

/**
 * Parse a Daily Text entry (scripture + comment) into structured game content.
 * Combines scripture text and comment for extraction.
 */
export function parseDailyText(
  scriptureRef: string,
  scriptureText: string,
  comment: string
): ParsedDailyText {
  const combined = `${scriptureRef} ${scriptureText} ${comment}`;

  return {
    vocabulary: extractVocabulary(combined),
    keyPeople: extractKeyPeople(combined),
    themes: extractVocabulary(combined).slice(0, 3), // Top 3 vocab as themes
    questions: extractQuestions(comment),
    keyPhrases: [
      // The scripture text itself is a key phrase
      scriptureText.length > 80
        ? scriptureText.slice(0, 77) + "..."
        : scriptureText,
      ...extractKeyPhrases(comment),
    ],
  };
}
