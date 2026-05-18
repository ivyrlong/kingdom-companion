export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getAgeGroup } from "@/lib/user";
import { notFound } from "next/navigation";
import {
  GAME_COMPONENTS,
  type GameProps,
  type AgeGroup,
  type ContentPackData,
} from "@/components/games/registry";

// Re-exported for back-compat: game components import these types from here.
export type { GameProps, AgeGroup, ContentPackData };

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
  const userAgeGroup = await getAgeGroup(session?.user?.id);

  // Load content pack if specified
  let contentPack: ContentPackData | undefined;
  let contentPackTitle: string | undefined;

  let imageUrl: string | undefined;

  if (packId) {
    const pack = await prisma.contentPack.findUnique({
      where: { id: packId },
      include: { images: { take: 1 } },
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

      // For coloring pages, pick the right image category based on user age
      if (slug === "coloring-page") {
        const preferredCategory = userAgeGroup === "LITTLE_ONES" ? "COLORING_SVG" : "COLORING_OUTLINE";
        const coloringImages = await prisma.imageAsset.findMany({
          where: {
            contentPackId: pack.id,
            categories: { hasSome: ["COLORING_SVG", "COLORING_OUTLINE"] },
          },
          take: 2,
        });
        const picked = coloringImages.find((i) => i.categories.includes(preferredCategory))
          ?? coloringImages[0];
        if (picked) imageUrl = `/${picked.path}`;
      } else if (pack.images.length > 0) {
        imageUrl = `/${pack.images[0].path}`;
      }
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
        ageGroup={userAgeGroup as AgeGroup}
        contentPack={contentPack}
        contentPackTitle={contentPackTitle}
        {...(imageUrl && { imageUrl })}
      />
    </div>
  );
}
