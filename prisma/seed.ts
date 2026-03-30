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
    slug: "paradise-earth-builder",
    title: "Paradise Earth Builder",
    description:
      "Build and decorate a beautiful paradise scene. Place animals, plants, and homes in your ideal paradise!",
    ageGroup: "LITTLE_ONES" as const,
    category: "Creative",
  },
  {
    slug: "kingdom-hall-dash",
    title: "Kingdom Hall Dash",
    description:
      "Get ready for the meeting! Collect your Bible, songbook, and notes while avoiding distractions.",
    ageGroup: "LITTLE_ONES" as const,
    category: "Arcade",
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
