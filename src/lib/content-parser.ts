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

// ─── Question Generation (simple pattern-based) ────────────────────────

/**
 * Extracts existing questions from text (lines ending in ?)
 */
export function extractQuestions(text: string): string[] {
  const lines = text.split(/\n/);
  const questions: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.endsWith("?") && trimmed.length > 15 && trimmed.length < 200) {
      // Remove leading numbers/bullets
      const cleaned = trimmed.replace(/^[\d.)\-*•]+\s*/, "");
      if (cleaned.length > 15) {
        questions.push(cleaned);
      }
    }
  }

  return questions;
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
