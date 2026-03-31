export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import BibleBooksBlitz from "@/components/games/BibleBooksBlitz";
import ScriptureMemoryMatch from "@/components/games/ScriptureMemoryMatch";
import BibleWordSearch from "@/components/games/BibleWordSearch";
import NameThatScripture from "@/components/games/NameThatScripture";
import TheocraticTrivia from "@/components/games/TheocraticTrivia";
import WhoAmI from "@/components/games/WhoAmI";
import QuietListeners from "@/components/games/QuietListeners";
import Crossword from "@/components/games/Crossword";
import Cryptogram from "@/components/games/Cryptogram";
import Hangman from "@/components/games/Hangman";

export interface ContentPackData {
  vocabulary: string[];
  scriptures: { reference: string; text: string }[];
  keyPeople: string[];
  themes: string[];
  questions: { question: string; answer: string; options?: string[] }[];
  keyPhrases: string[];
}

export type AgeGroup = "LITTLE_ONES" | "YOUTH" | "ADULT" | "FAMILY";

export interface GameProps {
  gameId: string;
  userId?: string;
  ageGroup?: AgeGroup;
  contentPack?: ContentPackData;
  contentPackTitle?: string;
}

const GAME_COMPONENTS: Record<string, React.ComponentType<GameProps>> = {
  "bible-books-blitz": BibleBooksBlitz,
  "scripture-memory-match": ScriptureMemoryMatch,
  "bible-word-search": BibleWordSearch,
  "name-that-scripture": NameThatScripture,
  "theocratic-trivia": TheocraticTrivia,
  "who-am-i": WhoAmI,
  "quiet-listeners": QuietListeners,
  "crossword": Crossword,
  "cryptogram": Cryptogram,
  "hangman": Hangman,
};

export default async function GamePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ pack?: string }>;
}) {
  const { slug } = await params;
  const { pack: packId } = await searchParams;

  const game = await prisma.game.findUnique({
    where: { slug },
  });

  if (!game || !game.isActive) notFound();

  const session = await auth();

  // Load content pack if specified
  let contentPack: ContentPackData | undefined;
  let contentPackTitle: string | undefined;

  if (packId) {
    const pack = await prisma.contentPack.findUnique({
      where: { id: packId },
    });
    if (pack) {
      contentPack = {
        vocabulary: pack.vocabulary as string[],
        scriptures: pack.scriptures as { reference: string; text: string }[],
        keyPeople: pack.keyPeople as string[],
        themes: pack.themes as string[],
        questions: pack.questions as { question: string; answer: string; options?: string[] }[],
        keyPhrases: pack.keyPhrases as string[],
      };
      contentPackTitle = pack.title;
    }
  }

  const GameComponent = GAME_COMPONENTS[slug];

  if (!GameComponent) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
          {game.title}
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-lg">
          This game is coming soon! Check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {contentPackTitle && (
        <p className="text-sm text-coral-600 dark:text-coral-400 mb-2">
          {contentPackTitle}
        </p>
      )}
      <GameComponent
        gameId={game.id}
        userId={session?.user?.id}
        ageGroup={(session?.user as { ageGroup?: string })?.ageGroup as AgeGroup | undefined}
        contentPack={contentPack}
        contentPackTitle={contentPackTitle}
      />
    </div>
  );
}
