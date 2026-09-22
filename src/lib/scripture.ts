/**
 * Scripture references — parsing and linking.
 *
 * The house rule this module encodes:
 *
 *   • Bible text is NOT restricted material. Wherever a verse can be
 *     stored, store the New World Translation wording verbatim.
 *   • Wherever a verse is only *cited*, render it as a pill that links
 *     back to jw.org so the reader opens the trusted source.
 *
 * That is the opposite of the posture for publication prose (Watchtower
 * / workbook paragraph text), which is never stored — see
 * `wol-import.ts` and `daily-text.ts`.
 *
 * Links are built as jw.org Finder URLs rather than wol.jw.org article
 * URLs, because the Finder handles the app handoff: on a phone or tablet
 * with JW Library installed the pill opens the verse in the app, and
 * falls back to the jw.org web reader everywhere else. That matters for
 * an app whose whole point is handing a child a tablet.
 *
 * A Finder verse id is BBCCCVVV — book (2), chapter (3), verse (3), each
 * zero-padded:
 *
 *   Psalm 37:4       -> 19 037 004  -> bible=19037004
 *   Proverbs 3:5, 6  -> 20 003 005  -> bible=20003005-20003006
 *
 * The RefChip in WorkbookPanel gets its URLs from hrefs scraped out of
 * the WOL article, so it needs none of this. Everything else in the app
 * only ever has a typed reference string, which is what this parses.
 */

export interface BibleBook {
  /** Canonical 1-66 position, which is also the Finder book number. */
  number: number;
  /** Display name, as it should be rendered in a pill. */
  name: string;
  /**
   * Lowercased spellings that resolve to this book — plural/singular
   * variants and the abbreviations that appear in workbook references
   * ("Isa", "1 Cor", "Matt"). Written without trailing periods; the
   * parser strips those before matching.
   */
  aliases: string[];
}

export const BIBLE_BOOKS: BibleBook[] = [
  { number: 1, name: "Genesis", aliases: ["genesis", "gen", "ge", "gn"] },
  { number: 2, name: "Exodus", aliases: ["exodus", "exod", "exo", "ex"] },
  { number: 3, name: "Leviticus", aliases: ["leviticus", "lev", "le", "lv"] },
  { number: 4, name: "Numbers", aliases: ["numbers", "num", "nu", "nm"] },
  {
    number: 5,
    name: "Deuteronomy",
    aliases: ["deuteronomy", "deut", "deu", "dt"],
  },
  { number: 6, name: "Joshua", aliases: ["joshua", "josh", "jos", "jsh"] },
  { number: 7, name: "Judges", aliases: ["judges", "judg", "jdg", "jg"] },
  { number: 8, name: "Ruth", aliases: ["ruth", "rut", "ru", "rth"] },
  {
    number: 9,
    name: "1 Samuel",
    aliases: ["1 samuel", "1 sam", "1 sa", "1sa", "1sam", "i samuel"],
  },
  {
    number: 10,
    name: "2 Samuel",
    aliases: ["2 samuel", "2 sam", "2 sa", "2sa", "2sam", "ii samuel"],
  },
  {
    number: 11,
    name: "1 Kings",
    aliases: ["1 kings", "1 ki", "1ki", "1kgs", "1 kgs", "i kings"],
  },
  {
    number: 12,
    name: "2 Kings",
    aliases: ["2 kings", "2 ki", "2ki", "2kgs", "2 kgs", "ii kings"],
  },
  {
    number: 13,
    name: "1 Chronicles",
    aliases: ["1 chronicles", "1 chron", "1 chr", "1chr", "1ch", "1 ch"],
  },
  {
    number: 14,
    name: "2 Chronicles",
    aliases: ["2 chronicles", "2 chron", "2 chr", "2chr", "2ch", "2 ch"],
  },
  { number: 15, name: "Ezra", aliases: ["ezra", "ezr", "ez"] },
  { number: 16, name: "Nehemiah", aliases: ["nehemiah", "neh", "ne"] },
  { number: 17, name: "Esther", aliases: ["esther", "esth", "est", "es"] },
  { number: 18, name: "Job", aliases: ["job", "jb"] },
  {
    number: 19,
    name: "Psalms",
    aliases: ["psalms", "psalm", "psa", "pss", "ps", "psm"],
  },
  {
    number: 20,
    name: "Proverbs",
    aliases: ["proverbs", "proverb", "prov", "pro", "prv", "pr"],
  },
  {
    number: 21,
    name: "Ecclesiastes",
    aliases: ["ecclesiastes", "eccl", "ecc", "ec", "qoheleth"],
  },
  {
    number: 22,
    name: "Song of Solomon",
    aliases: [
      "song of solomon",
      "song of songs",
      "song of sol",
      "canticles",
      "song",
      "sos",
      "ca",
      "cant",
    ],
  },
  { number: 23, name: "Isaiah", aliases: ["isaiah", "isa", "is"] },
  { number: 24, name: "Jeremiah", aliases: ["jeremiah", "jer", "je"] },
  {
    number: 25,
    name: "Lamentations",
    aliases: ["lamentations", "lam", "la"],
  },
  { number: 26, name: "Ezekiel", aliases: ["ezekiel", "ezek", "eze", "ezk"] },
  { number: 27, name: "Daniel", aliases: ["daniel", "dan", "da", "dn"] },
  { number: 28, name: "Hosea", aliases: ["hosea", "hos", "ho"] },
  { number: 29, name: "Joel", aliases: ["joel", "joe", "jl"] },
  { number: 30, name: "Amos", aliases: ["amos", "amo", "am"] },
  { number: 31, name: "Obadiah", aliases: ["obadiah", "obad", "oba", "ob"] },
  { number: 32, name: "Jonah", aliases: ["jonah", "jon", "jnh"] },
  { number: 33, name: "Micah", aliases: ["micah", "mic", "mi"] },
  { number: 34, name: "Nahum", aliases: ["nahum", "nah", "na"] },
  {
    number: 35,
    name: "Habakkuk",
    aliases: ["habakkuk", "hab", "hb"],
  },
  {
    number: 36,
    name: "Zephaniah",
    aliases: ["zephaniah", "zeph", "zep", "zp"],
  },
  { number: 37, name: "Haggai", aliases: ["haggai", "hag", "hg"] },
  {
    number: 38,
    name: "Zechariah",
    aliases: ["zechariah", "zech", "zec", "zc"],
  },
  { number: 39, name: "Malachi", aliases: ["malachi", "mal", "ml"] },
  {
    number: 40,
    name: "Matthew",
    aliases: ["matthew", "matt", "mat", "mt"],
  },
  { number: 41, name: "Mark", aliases: ["mark", "mar", "mk", "mr"] },
  { number: 42, name: "Luke", aliases: ["luke", "luk", "lk"] },
  { number: 43, name: "John", aliases: ["john", "joh", "jhn", "jn"] },
  { number: 44, name: "Acts", aliases: ["acts", "act", "ac"] },
  { number: 45, name: "Romans", aliases: ["romans", "rom", "ro", "rm"] },
  {
    number: 46,
    name: "1 Corinthians",
    aliases: ["1 corinthians", "1 cor", "1cor", "1 co", "1co"],
  },
  {
    number: 47,
    name: "2 Corinthians",
    aliases: ["2 corinthians", "2 cor", "2cor", "2 co", "2co"],
  },
  {
    number: 48,
    name: "Galatians",
    aliases: ["galatians", "gal", "ga"],
  },
  {
    number: 49,
    name: "Ephesians",
    aliases: ["ephesians", "eph", "ep"],
  },
  {
    number: 50,
    name: "Philippians",
    aliases: ["philippians", "phil", "php", "ph"],
  },
  {
    number: 51,
    name: "Colossians",
    aliases: ["colossians", "col", "cl"],
  },
  {
    number: 52,
    name: "1 Thessalonians",
    aliases: ["1 thessalonians", "1 thess", "1 thes", "1th", "1 th"],
  },
  {
    number: 53,
    name: "2 Thessalonians",
    aliases: ["2 thessalonians", "2 thess", "2 thes", "2th", "2 th"],
  },
  {
    number: 54,
    name: "1 Timothy",
    aliases: ["1 timothy", "1 tim", "1tim", "1 ti", "1ti"],
  },
  {
    number: 55,
    name: "2 Timothy",
    aliases: ["2 timothy", "2 tim", "2tim", "2 ti", "2ti"],
  },
  { number: 56, name: "Titus", aliases: ["titus", "tit", "ti"] },
  {
    number: 57,
    name: "Philemon",
    aliases: ["philemon", "philem", "phm", "phlm"],
  },
  { number: 58, name: "Hebrews", aliases: ["hebrews", "heb", "hb"] },
  { number: 59, name: "James", aliases: ["james", "jas", "jam", "jm"] },
  {
    number: 60,
    name: "1 Peter",
    aliases: ["1 peter", "1 pet", "1pet", "1 pe", "1pe"],
  },
  {
    number: 61,
    name: "2 Peter",
    aliases: ["2 peter", "2 pet", "2pet", "2 pe", "2pe"],
  },
  {
    number: 62,
    name: "1 John",
    aliases: ["1 john", "1 joh", "1jn", "1 jn", "1jo"],
  },
  {
    number: 63,
    name: "2 John",
    aliases: ["2 john", "2 joh", "2jn", "2 jn", "2jo"],
  },
  {
    number: 64,
    name: "3 John",
    aliases: ["3 john", "3 joh", "3jn", "3 jn", "3jo"],
  },
  { number: 65, name: "Jude", aliases: ["jude", "jud", "jd"] },
  {
    number: 66,
    name: "Revelation",
    aliases: ["revelation", "revelations", "rev", "re", "rv"],
  },
];

/** alias -> book, built once. */
const BOOK_BY_ALIAS: Map<string, BibleBook> = (() => {
  const m = new Map<string, BibleBook>();
  for (const book of BIBLE_BOOKS) {
    for (const alias of book.aliases) m.set(alias, book);
    m.set(book.name.toLowerCase(), book);
  }
  return m;
})();

export interface ParsedScriptureRef {
  book: BibleBook;
  /** First chapter cited. */
  chapter: number;
  /** Last chapter cited — equal to `chapter` unless the ref spans chapters. */
  endChapter: number;
  /** First verse cited; null when the reference is a whole chapter. */
  verse: number | null;
  /** Last verse cited; null when the reference is a whole chapter. */
  endVerse: number | null;
  /** Tidied display label, e.g. "Psalms 37:4". */
  label: string;
}

/**
 * Books written as a single chapter. A reference like "3 John 4" or
 * "Jude 9" names a VERSE, not a chapter — there is only one chapter to
 * be in. Without this, "3 John 4" would link to a non-existent
 * chapter 4.
 */
const SINGLE_CHAPTER_BOOKS = new Set([
  31, // Obadiah
  57, // Philemon
  63, // 2 John
  64, // 3 John
  65, // Jude
]);

/**
 * Book portion, then the first number.
 *
 * The book group deliberately swallows an optional leading 1-3 ordinal
 * itself rather than capturing it separately. An earlier version made
 * the ordinal its own `(?:[123]|I{1,3})?` group, which quietly ate the
 * leading "I" of "Isaiah" — so "Isa 65:17-25" resolved to 1 Samuel and
 * "Isaiah 65:17-25" failed outright. Roman numerals are handled in
 * `resolveBook` instead, where a failed lookup can fall back safely.
 */
const REF_PATTERN =
  /^\s*([1-3]?\s*[A-Za-z][A-Za-z.\s]*?)\s*(\d+)(?:\s*[:.]\s*(\d+))?\s*(.*)$/;

/**
 * Resolve a book name, tolerating periods, spacing and roman-numeral
 * ordinals. Tries the literal spelling first so a real book name always
 * wins over an ordinal reading.
 */
function resolveBook(raw: string): BibleBook | undefined {
  const normalised = raw
    .replace(/\./g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (!normalised) return undefined;

  const direct = BOOK_BY_ALIAS.get(normalised);
  if (direct) return direct;

  // "ii kings" -> "2 kings". Only reached when the literal spelling
  // didn't resolve, so "isaiah" can never be read as "1 saiah".
  const roman = /^(i{1,3})\s+(.+)$/.exec(normalised);
  if (roman) {
    const digit = String(roman[1].length);
    return BOOK_BY_ALIAS.get(`${digit} ${roman[2]}`);
  }
  return undefined;
}

/**
 * Parse a typed scripture reference into structured form.
 *
 * Handles the shapes that actually show up in this app's data — the
 * Daily Text form, workbook `bibleReadingRange`, and encyclopedia
 * `bibleRef`:
 *
 *   Psalm 37:4              single verse
 *   Proverbs 3:5, 6         comma list  -> spans 5 to 6
 *   Isaiah 65:17-25         verse range
 *   Matthew 24:14           single verse
 *   Isaiah 65-66            chapter range
 *   Genesis 1               whole chapter
 *   Ps. 37:4                abbreviated, with periods
 *   1 Corinthians 13:4-8    ordinal book
 *
 * A comma list is collapsed to its span (first..last) rather than
 * linking each verse separately — the reader lands in the right place
 * either way, and one pill beats three.
 *
 * Returns null when the string isn't a reference, so callers can render
 * a plain label with no link instead of a broken one.
 */
export function parseScriptureRef(raw: string): ParsedScriptureRef | null {
  if (typeof raw !== "string") return null;
  // Normalise the dash family and whitespace up front so the numeric
  // parsing below only ever sees "-".
  const cleaned = raw
    .replace(/[‐-―−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;

  const m = REF_PATTERN.exec(cleaned);
  if (!m) return null;

  const [, bookRaw, firstNumberRaw, verseRaw, restRaw] = m;

  const book = resolveBook(bookRaw);
  if (!book) return null;

  const firstNumber = parseInt(firstNumberRaw, 10);
  if (!Number.isFinite(firstNumber) || firstNumber < 1) return null;

  const rest = (restRaw ?? "").trim();

  // No ":" — the number we read was a chapter, unless this is a
  // single-chapter book, where "Jude 9" means verse 9.
  if (verseRaw === undefined) {
    if (SINGLE_CHAPTER_BOOKS.has(book.number)) {
      const verseRange = /^-\s*(\d+)/.exec(rest);
      const lastVerse = verseRange
        ? parseInt(verseRange[1], 10)
        : firstNumber;
      return {
        book,
        chapter: 1,
        endChapter: 1,
        verse: firstNumber,
        endVerse: Math.max(firstNumber, lastVerse),
        // Single-chapter books are cited without the "1:" — keep the
        // label in the form the reader typed it.
        label:
          lastVerse > firstNumber
            ? `${book.name} ${firstNumber}-${lastVerse}`
            : `${book.name} ${firstNumber}`,
      };
    }

    // Possibly a chapter range ("Isaiah 65-66").
    const chapterRange = /^-\s*(\d+)/.exec(rest);
    const endChapter = chapterRange
      ? parseInt(chapterRange[1], 10)
      : firstNumber;
    return {
      book,
      chapter: firstNumber,
      endChapter: Math.max(firstNumber, endChapter),
      verse: null,
      endVerse: null,
      label: formatLabel(book, firstNumber, endChapter, null, null),
    };
  }

  const chapter = firstNumber;
  const verse = parseInt(verseRaw, 10);
  if (!Number.isFinite(verse) || verse < 1) return null;

  // Collect every further verse number in the tail: "-25", ", 6", ", 6, 7".
  // A cross-chapter tail ("65:17-66:2") is read as a chapter span.
  let endChapter = chapter;
  let endVerse = verse;

  const crossChapter = /^-\s*(\d+)\s*[:.]\s*(\d+)/.exec(rest);
  if (crossChapter) {
    endChapter = parseInt(crossChapter[1], 10);
    endVerse = parseInt(crossChapter[2], 10);
  } else {
    const tailNumbers = rest.match(/\d+/g);
    if (tailNumbers && tailNumbers.length > 0) {
      const last = parseInt(tailNumbers[tailNumbers.length - 1], 10);
      if (Number.isFinite(last) && last > endVerse) endVerse = last;
    }
  }

  // Only clamp the end verse upward when the range stays inside one
  // chapter. Across a chapter boundary the end verse is legitimately
  // lower than the start ("Isaiah 65:17-66:2").
  if (endChapter === chapter && endVerse < verse) endVerse = verse;
  endChapter = Math.max(chapter, endChapter);

  return {
    book,
    chapter,
    endChapter,
    verse,
    endVerse,
    label: formatLabel(book, chapter, endChapter, verse, endVerse),
  };
}

function formatLabel(
  book: BibleBook,
  chapter: number,
  endChapter: number,
  verse: number | null,
  endVerse: number | null,
): string {
  if (verse === null) {
    return endChapter > chapter
      ? `${book.name} ${chapter}-${endChapter}`
      : `${book.name} ${chapter}`;
  }
  if (endChapter > chapter) {
    return `${book.name} ${chapter}:${verse}–${endChapter}:${endVerse}`;
  }
  if (endVerse !== null && endVerse > verse) {
    return `${book.name} ${chapter}:${verse}-${endVerse}`;
  }
  return `${book.name} ${chapter}:${verse}`;
}

/** BBCCCVVV, zero-padded. */
function verseId(bookNumber: number, chapter: number, verse: number): string {
  return (
    String(bookNumber).padStart(2, "0") +
    String(chapter).padStart(3, "0") +
    String(verse).padStart(3, "0")
  );
}

const FINDER_BASE = "https://www.jw.org/finder";

/**
 * Build the jw.org Finder URL for a parsed reference.
 *
 * Whole chapters link as verse 1 through 999 — the Finder clamps to the
 * chapter's real length, and it saves us shipping a verse-count table
 * for all 1,189 chapters.
 */
export function scriptureUrlFor(ref: ParsedScriptureRef): string {
  const startVerse = ref.verse ?? 1;
  const endVerse = ref.verse === null ? 999 : (ref.endVerse ?? startVerse);

  const start = verseId(ref.book.number, ref.chapter, startVerse);
  const end = verseId(ref.book.number, ref.endChapter, endVerse);
  const bible = start === end ? start : `${start}-${end}`;

  const params = new URLSearchParams({
    wtlocale: "E",
    prefer: "lang",
    pub: "nwtsty",
    bible,
  });
  return `${FINDER_BASE}?${params.toString()}`;
}

/**
 * One-shot: reference string in, link out. Returns null when the string
 * can't be parsed, which is the caller's cue to render an unlinked pill.
 */
export function scriptureUrl(raw: string): string | null {
  const parsed = parseScriptureRef(raw);
  return parsed ? scriptureUrlFor(parsed) : null;
}

export interface ScriptureCitation {
  /** Tidied label for the pill, falling back to the raw input. */
  label: string;
  /** jw.org Finder URL, or null when the reference didn't parse. */
  url: string | null;
}

/**
 * The shape a pill wants. Always returns something renderable: an
 * unparseable reference still gets its original text as the label, just
 * without a link.
 */
export function toCitation(raw: string): ScriptureCitation {
  const parsed = parseScriptureRef(raw);
  if (!parsed) return { label: raw.trim(), url: null };
  return { label: parsed.label, url: scriptureUrlFor(parsed) };
}
