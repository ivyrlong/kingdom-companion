export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import BibleBooksBlitz from "@/components/games/BibleBooksBlitz";
import ScriptureMemoryMatch from "@/components/games/ScriptureMemoryMatch";

const GAME_COMPONENTS: Record<string, React.ComponentType<{ gameId: string; userId?: string }>> = {
  "bible-books-blitz": BibleBooksBlitz,
  "scripture-memory-match": ScriptureMemoryMatch,
};

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const game = await prisma.game.findUnique({
    where: { slug },
  });

  if (!game || !game.isActive) notFound();

  const session = await auth();
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
      <GameComponent gameId={game.id} userId={session?.user?.id} />
    </div>
  );
}
