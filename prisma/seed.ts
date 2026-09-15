import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const games = [
  {
    slug: "bible-books-blitz",
    title: "Bible Books Blitz",
    description:
      "Drag and drop the books of the Bible into the correct order. How fast can you arrange them all?",
    ageGroup: "YOUTH" as const,
    category: "Quiz",
  },
  {
    slug: "scripture-memory-match",
    title: "Scripture Memory Match",
    description:
      "Flip cards to match Bible verses with their references. Train your memory!",
    ageGroup: "YOUTH" as const,
    category: "Memory",
  },
  {
    slug: "who-am-i",
    title: "Who Am I?",
    description:
      "Read clues about a Bible character and guess who it is. The fewer clues you need, the higher your score!",
    ageGroup: "YOUTH" as const,
    category: "Quiz",
  },
  {
    slug: "bible-word-search",
    title: "Bible Word Search",
    description:
      "Find hidden Bible-themed words in the grid. Themed puzzles from Creation to Revelation!",
    ageGroup: "LITTLE_ONES" as const,
    category: "Puzzle",
  },
  {
    slug: "story-sequencer",
    title: "Story Sequencer",
    description:
      "Put Bible events in chronological order. Do you know what happened first?",
    ageGroup: "YOUTH" as const,
    category: "Quiz",
  },
  {
    slug: "theocratic-trivia",
    title: "Theocratic Trivia",
    description:
      "Test your Bible knowledge with challenging trivia questions across multiple categories.",
    ageGroup: "ADULT" as const,
    category: "Trivia",
  },
  {
    slug: "name-that-scripture",
    title: "Name That Scripture",
    description:
      "Given a verse, can you identify which book it comes from? Put your scripture knowledge to the test!",
    ageGroup: "YOUTH" as const,
    category: "Quiz",
  },
  {
    slug: "bible-geography",
    title: "Bible Geography",
    description:
      "Where did key Bible events take place? Test your knowledge of Bible lands and locations.",
    ageGroup: "YOUTH" as const,
    category: "Geography",
  },
  {
    slug: "kingdom-hall-dash",
    title: "Kingdom Hall Dash",
    description:
      "Get ready for the meeting! Collect your Bible, songbook, and notes while avoiding distractions.",
    ageGroup: "LITTLE_ONES" as const,
    category: "Arcade",
  },
  {
    slug: "quiet-listeners",
    title: "Quiet Listeners",
    description:
      "Count how many times you hear Jehovah, Jesus, and Bible during the meeting. A great tool for little ones!",
    ageGroup: "LITTLE_ONES" as const,
    category: "Meeting Tool",
  },
  {
    slug: "crossword",
    title: "Crossword",
    description:
      "Solve Bible-themed crossword puzzles. Tap clues, fill in letters, and complete the grid!",
    ageGroup: "YOUTH" as const,
    category: "Puzzle",
  },
  {
    slug: "cryptogram",
    title: "Cryptogram",
    description:
      "Crack the code! Each symbol represents a letter. Decode the hidden Bible phrase.",
    ageGroup: "YOUTH" as const,
    category: "Puzzle",
  },
  {
    slug: "hangman",
    title: "Hangman",
    description:
      "Guess the Bible-themed word letter by letter before the drawing is complete!",
    ageGroup: "FAMILY" as const,
    category: "Word",
  },
  {
    slug: "jigsaw-puzzle",
    title: "Jigsaw Puzzle",
    description:
      "Drag and drop the pieces to complete the picture! Choose your difficulty level.",
    ageGroup: "LITTLE_ONES" as const,
    category: "Puzzle",
  },
  {
    slug: "coloring-page",
    title: "Coloring Page",
    description:
      "Bring Bible scenes to life with color! Little ones can tap to fill, while older ones can draw freehand.",
    ageGroup: "FAMILY" as const,
    category: "Creative",
  },
  {
    slug: "meeting-bingo",
    title: "Meeting Bingo",
    description:
      "Listen for words during the meeting and mark your card. Get three in a row to call BINGO!",
    ageGroup: "LITTLE_ONES" as const,
    category: "Meeting Tool",
  },
  {
    slug: "meeting-maze",
    title: "Meeting Maze",
    description:
      "A fresh maze puzzle every meeting week. Guide your dot from start to finish before your grown-ups say the closing prayer.",
    ageGroup: "FAMILY" as const,
    category: "Puzzle",
  },
  {
    slug: "paradise-builder",
    title: "Paradise Builder",
    description:
      "Pick a scene and add your favourite friends, animals, plants, and things to imagine what paradise will look like. Save your pages and come back to keep building.",
    ageGroup: "YOUTH" as const,
    category: "Creative",
  },
  {
    slug: "hidden-objects",
    title: "Find the Hidden Things",
    description:
      "A new busy scene every round with things tucked in among each other. Find every item on the list — some hide, some peek, some come in twos or threes!",
    ageGroup: "YOUTH" as const,
    category: "Puzzle",
  },
];

// Starter set of vocabulary categories. Broad on purpose — 8–10 buckets
// are easier to maintain and to browse than 40. Add finer-grained ones as
// you notice patterns while categorising the inbox.
const vocabularyCategories = [
  {
    slug: "bible-characters",
    name: "Bible Characters",
    description: "People whose accounts we read in the Bible.",
    icon: "👥",
    sortOrder: 10,
  },
  {
    slug: "jehovah-and-jesus",
    name: "Jehovah and Jesus",
    description: "Names, titles, and qualities of Jehovah and his Son.",
    icon: "✨",
    sortOrder: 20,
  },
  {
    slug: "prayer",
    name: "Prayer",
    description: "Prayer, praise, thanksgiving, meditation.",
    icon: "🙏",
    sortOrder: 30,
  },
  {
    slug: "worship-and-meetings",
    name: "Worship & Meetings",
    description:
      "Songs, meetings, Watchtower study, personal Bible study.",
    icon: "🎵",
    sortOrder: 40,
  },
  {
    slug: "ministry",
    name: "Ministry",
    description:
      "Field service, preaching, witnessing, house-to-house, informal.",
    icon: "🌾",
    sortOrder: 50,
  },
  {
    slug: "faith-and-trials",
    name: "Faith & Trials",
    description:
      "Faith, patience, endurance, hardship, comfort, hope.",
    icon: "🛡️",
    sortOrder: 60,
  },
  {
    slug: "family-and-marriage",
    name: "Family & Marriage",
    description: "Parents, children, marriage, family worship.",
    icon: "🏡",
    sortOrder: 70,
  },
  {
    slug: "congregation-and-organization",
    name: "Congregation & Organization",
    description: "Elders, ministerial servants, congregation, branch office.",
    icon: "🐑",
    sortOrder: 80,
  },
  {
    slug: "kingdom-hope",
    name: "Kingdom Hope",
    description:
      "The Kingdom, paradise, resurrection, the new world.",
    icon: "🌱",
    sortOrder: 90,
  },
  {
    slug: "christian-conduct",
    name: "Christian Conduct",
    description:
      "Christian qualities, love, kindness, honesty, self-control.",
    icon: "💛",
    sortOrder: 100,
  },
];

const badges = [
  {
    name: "First Steps",
    description: "Play your first game",
  },
  {
    name: "Bookworm",
    description: "Complete Bible Books Blitz with a perfect score",
  },
  {
    name: "Sharp Memory",
    description: "Complete Scripture Memory Match without mistakes",
  },
  {
    name: "Bible Scholar",
    description: "Reach level 10",
  },
  {
    name: "Faithful Student",
    description: "Play 50 games total",
  },
  {
    name: "Game Explorer",
    description: "Play every available game at least once",
  },
];

async function main() {
  console.log("Seeding database...");

  for (const game of games) {
    await prisma.game.upsert({
      where: { slug: game.slug },
      update: game,
      create: game,
    });
    console.log(`  Game: ${game.title}`);
  }

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: badge,
      create: badge,
    });
    console.log(`  Badge: ${badge.name}`);
  }

  for (const cat of vocabularyCategories) {
    await prisma.vocabularyCategory.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    });
    console.log(`  Category: ${cat.name}`);
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
