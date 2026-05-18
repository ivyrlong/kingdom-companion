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
import JigsawPuzzle from "@/components/games/JigsawPuzzle";
import ColoringPage from "@/components/games/ColoringPage";
import MeetingBingo from "@/components/games/MeetingBingo";

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

export const GAME_COMPONENTS: Record<
  string,
  React.ComponentType<GameProps>
> = {
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
  "jigsaw-puzzle": JigsawPuzzle as unknown as React.ComponentType<GameProps>,
  "coloring-page": ColoringPage as unknown as React.ComponentType<GameProps>,
  "meeting-bingo": MeetingBingo,
};

/**
 * Renders a single game by slug from a content pack — used to embed the
 * featured daily game inline on the Today page. Returns null for an unknown
 * slug so callers can fall back gracefully.
 */
export function InlineGame({
  slug,
  gameId,
  userId,
  ageGroup,
  contentPack,
  contentPackTitle,
  imageUrl,
}: {
  slug: string;
  gameId: string;
  userId?: string;
  ageGroup?: AgeGroup;
  contentPack?: ContentPackData;
  contentPackTitle?: string;
  imageUrl?: string;
}) {
  const GameComponent = GAME_COMPONENTS[slug];
  if (!GameComponent) return null;
  return (
    <GameComponent
      gameId={gameId}
      userId={userId}
      ageGroup={ageGroup}
      contentPack={contentPack}
      contentPackTitle={contentPackTitle}
      {...(imageUrl ? { imageUrl } : {})}
    />
  );
}
