"use client";

/**
 * ParadiseBuilder — the games-registry wrapper for Paradise Builder.
 *
 * Renders the ParadiseList component (the "your pages" grid + scene picker)
 * inside the games shell. The full-canvas editor at /paradise/[id] handles
 * its own routing; scene picking navigates there directly via router.push.
 *
 * GameProps (gameId, userId, ageGroup, contentPack…) are intentionally
 * unused — Paradise Builder is a save-state game, not a content-pack game.
 */

import ParadiseList from "@/components/paradise/ParadiseList";

export default function ParadiseBuilder() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Paradise Builder
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          Pick a scene, drag your favourite friends, animals, and things onto it,
          and imagine what paradise will look like.
        </p>
      </div>
      <ParadiseList />
    </div>
  );
}
