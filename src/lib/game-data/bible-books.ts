export const BIBLE_BOOKS = {
  hebrew: [
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
    "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
    "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles",
    "Ezra", "Nehemiah", "Esther", "Job", "Psalms",
    "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah",
    "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel",
    "Amos", "Obadiah", "Jonah", "Micah", "Nahum",
    "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
  ],
  greek: [
    "Matthew", "Mark", "Luke", "John", "Acts",
    "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
    "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians",
    "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews",
    "James", "1 Peter", "2 Peter", "1 John", "2 John",
    "3 John", "Jude", "Revelation",
  ],
};

export const ALL_BOOKS = [...BIBLE_BOOKS.hebrew, ...BIBLE_BOOKS.greek];

export type Difficulty = "easy" | "medium" | "hard";

export function getBooksForDifficulty(difficulty: Difficulty): string[] {
  switch (difficulty) {
    case "easy":
      // First 10 books only
      return ALL_BOOKS.slice(0, 10);
    case "medium":
      // 20 books from mixed sections
      return [
        ...BIBLE_BOOKS.hebrew.slice(0, 10),
        ...BIBLE_BOOKS.greek.slice(0, 10),
      ];
    case "hard":
      // All 66 books
      return ALL_BOOKS;
  }
}
