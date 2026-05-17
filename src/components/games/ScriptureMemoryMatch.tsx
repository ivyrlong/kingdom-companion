"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useGameSession } from "@/hooks/useGameSession";
import { getRandomPairs, type ScripturePair } from "@/lib/game-data/scripture-pairs";
import type { GameProps } from "@/app/(dashboard)/games/[slug]/page";
import Confetti from "@/components/Confetti";
import { useEncyclopedia } from "@/components/encyclopedia/EncyclopediaProvider";

type Props = GameProps;

interface Card {
  id: number;
  pairId: number;
  type: "reference" | "text";
  content: string;
  flipped: boolean;
  matched: boolean;
}

type PairCount = 4 | 6 | 8;

const DIFFICULTY_OPTIONS: { count: PairCount; label: string; desc: string }[] =
  [
    { count: 4, label: "Easy (4 pairs)", desc: "8 cards to match" },
    { count: 6, label: "Medium (6 pairs)", desc: "12 cards to match" },
    { count: 8, label: "Hard (8 pairs)", desc: "16 cards to match" },
  ];

function shuffleCards(cards: Card[]): Card[] {
  const a = [...cards];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ScriptureMemoryMatch({ gameId, userId, contentPack }: Props) {
  const { status, finalScore, startSession, endSession, reset } =
    useGameSession({ gameId, userId });
  const { discover } = useEncyclopedia();

  const [pairCount, setPairCount] = useState<PairCount>(4);
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [moves, setMoves] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startGame = useCallback(
    async (count: PairCount) => {
      setPairCount(count);

      // Use content pack scriptures if available, otherwise use defaults
      let pairs: ScripturePair[];
      if (contentPack?.scriptures && contentPack.scriptures.length >= count) {
        const shuffled = [...contentPack.scriptures].sort(() => Math.random() - 0.5);
        pairs = shuffled.slice(0, count);
      } else {
        pairs = getRandomPairs(count);
      }
      let id = 0;
      const newCards: Card[] = [];

      pairs.forEach((pair, pairIndex) => {
        newCards.push({
          id: id++,
          pairId: pairIndex,
          type: "reference",
          content: pair.reference,
          flipped: false,
          matched: false,
        });
        newCards.push({
          id: id++,
          pairId: pairIndex,
          type: "text",
          content:
            pair.text.length > 80 ? pair.text.slice(0, 77) + "..." : pair.text,
          flipped: false,
          matched: false,
        });
      });

      setCards(shuffleCards(newCards));
      setFlippedIds([]);
      setMatchedPairs(0);
      setMoves(0);
      setTimeElapsed(0);
      setIsChecking(false);
      await startSession();
    },
    [startSession, contentPack]
  );

  useEffect(() => {
    if (status === "playing") {
      timerRef.current = setInterval(
        () => setTimeElapsed((t) => t + 1),
        1000
      );
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const handleCardClick = useCallback(
    (cardId: number) => {
      if (status !== "playing" || isChecking) return;

      const card = cards.find((c) => c.id === cardId);
      if (!card || card.flipped || card.matched) return;
      if (flippedIds.length >= 2) return;

      const newFlipped = [...flippedIds, cardId];
      setFlippedIds(newFlipped);
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, flipped: true } : c))
      );

      if (newFlipped.length === 2) {
        setMoves((m) => m + 1);
        setIsChecking(true);

        const [firstId, secondId] = newFlipped;
        const first = cards.find((c) => c.id === firstId)!;
        const second = cards.find((c) => c.id === secondId)!;

        if (
          first.pairId === second.pairId &&
          first.type !== second.type
        ) {
          // Encyclopedia discovery on match — try the reference text
          const refCard = first.type === "reference" ? first : second;
          discover(refCard.content, "scripture-memory-match");

          // Match found
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c) =>
                c.pairId === first.pairId ? { ...c, matched: true } : c
              )
            );
            setFlippedIds([]);
            setIsChecking(false);

            const newMatchedCount = matchedPairs + 1;
            setMatchedPairs(newMatchedCount);

            if (newMatchedCount === pairCount) {
              if (timerRef.current) clearInterval(timerRef.current);
              const timeBonus = Math.max(0, 120 - timeElapsed) * 5;
              const moveBonus = Math.max(
                0,
                (pairCount * 2 - moves) * 20
              );
              const baseScore = pairCount * 200;
              const score = Math.max(0, baseScore + timeBonus + moveBonus);
              endSession(score);
            }
          }, 500);
        } else {
          // No match — flip back
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c) =>
                newFlipped.includes(c.id) ? { ...c, flipped: false } : c
              )
            );
            setFlippedIds([]);
            setIsChecking(false);
          }, 1000);
        }
      }
    },
    [
      status,
      isChecking,
      cards,
      flippedIds,
      matchedPairs,
      pairCount,
      timeElapsed,
      moves,
      endSession,
      discover,
    ]
  );

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Start screen
  if (status === "idle") {
    return (
      <div className="text-center">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Scripture Memory Match
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-md mx-auto">
          Match Bible verse references with their text. Flip two cards at a time
          to find pairs!
        </p>

        <div className="space-y-3 max-w-sm mx-auto">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Choose difficulty:
          </p>
          {DIFFICULTY_OPTIONS.map(({ count, label, desc }) => (
            <button
              key={count}
              onClick={() => startGame(count)}
              className="w-full p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-coral-300 dark:hover:border-coral-700 transition text-left"
            >
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {label}
              </span>
              <span className="block text-sm text-zinc-500 dark:text-zinc-400">
                {desc}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Finished screen
  if (status === "finished") {
    return (
      <>
      <Confetti active={status === "finished"} />
      <div className="text-center">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Well Done!
        </h1>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 max-w-sm mx-auto mb-6">
          <p className="text-5xl font-bold text-coral-600 dark:text-coral-400 mb-4">
            {finalScore?.toLocaleString()}
          </p>
          <div className="space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
            <p>
              Time: {formatTime(timeElapsed)} | Moves: {moves}
            </p>
            <p>
              {pairCount} pairs matched | Perfect moves: {pairCount}
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              reset();
              startGame(pairCount);
            }}
            className="px-6 py-2.5 bg-coral-600 hover:bg-coral-700 text-white font-medium rounded-lg transition"
          >
            Play Again
          </button>
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition"
          >
            Change Difficulty
          </button>
        </div>
      </div>
      </>
    );
  }

  // Playing screen
  const gridCols =
    pairCount <= 4
      ? "grid-cols-4"
      : pairCount <= 6
        ? "grid-cols-4"
        : "grid-cols-4";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Scripture Memory Match
        </h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">
            {formatTime(timeElapsed)}
          </span>
          <span className="text-zinc-500 dark:text-zinc-400">
            {matchedPairs}/{pairCount} pairs
          </span>
          <span className="text-zinc-500 dark:text-zinc-400">
            {moves} moves
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 mb-6">
        <div
          className="bg-coral-500 h-2 rounded-full transition-all duration-300"
          style={{
            width: `${(matchedPairs / pairCount) * 100}%`,
          }}
        />
      </div>

      {/* Card grid */}
      <div className={`grid ${gridCols} gap-3`}>
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            disabled={card.matched || card.flipped}
            className={`relative h-28 sm:h-32 rounded-xl transition-all duration-300 text-sm ${
              card.matched
                ? "bg-coral-50 dark:bg-coral-900/20 border-2 border-coral-300 dark:border-coral-700 opacity-60"
                : card.flipped
                  ? "bg-white dark:bg-zinc-800 border-2 border-coral-400 dark:border-coral-500 shadow-md"
                  : "bg-coral-600 dark:bg-coral-800 border-2 border-coral-600 dark:border-coral-800 hover:bg-coral-500 dark:hover:bg-coral-700 cursor-pointer shadow-sm hover:shadow-md"
            }`}
          >
            {card.flipped || card.matched ? (
              <div className="p-2 flex items-center justify-center h-full">
                <span
                  className={`${
                    card.type === "reference"
                      ? "font-bold text-coral-700 dark:text-coral-300 text-base"
                      : "text-zinc-600 dark:text-zinc-300 text-xs leading-tight"
                  }`}
                >
                  {card.content}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <span className="text-white text-2xl font-bold">?</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
