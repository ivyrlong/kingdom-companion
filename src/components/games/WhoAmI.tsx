"use client";

import { useState, useCallback, useMemo } from "react";
import { useGameSession } from "@/hooks/useGameSession";
import type { GameProps } from "@/app/(dashboard)/games/[slug]/page";
import Confetti from "@/components/Confetti";
import { getIconForConcept } from "@/components/icons/BibleIcons";
import { useEncyclopedia } from "@/components/encyclopedia/EncyclopediaProvider";

type Props = GameProps;

function getDifficulty(ageGroup?: string) {
  switch (ageGroup) {
    case "LITTLE_ONES": return "easy";
    case "ADULT": return "hard";
    default: return "medium"; // YOUTH, FAMILY, undefined
  }
}

interface CharacterData {
  name: string;
  clues: string[];
}

// Built-in character database with progressive clues (hardest → easiest)
const CHARACTER_DATABASE: CharacterData[] = [
  {
    name: "Moses",
    clues: [
      "I was raised in a royal palace but was not of royal blood.",
      "I once had to flee my homeland after a rash act.",
      "God spoke to me through a burning bush.",
      "I led an entire nation out of slavery.",
      "I received the Ten Commandments on a mountain.",
    ],
  },
  {
    name: "David",
    clues: [
      "I was the youngest of many brothers.",
      "I was skilled at playing a stringed instrument.",
      "I defeated a giant with an unlikely weapon.",
      "I became king after years of being hunted by the previous king.",
      "I wrote many of the Psalms.",
    ],
  },
  {
    name: "Ruth",
    clues: [
      "I was not originally an Israelite.",
      "I made a life-changing decision to leave my homeland.",
      "I said: 'Where you go I will go.'",
      "I worked hard gleaning in the fields.",
      "I became an ancestor of King David.",
    ],
  },
  {
    name: "Daniel",
    clues: [
      "I was taken captive to a foreign land as a young man.",
      "I refused to eat the king's food.",
      "I could understand visions and dreams.",
      "My three close friends survived a fiery furnace.",
      "I spent a night in a den of lions and survived.",
    ],
  },
  {
    name: "Abraham",
    clues: [
      "I left my homeland because God told me to.",
      "I waited decades for a promised child.",
      "Three visitors once came to my tent with amazing news.",
      "My wife laughed when she heard a surprising promise.",
      "I am known as the father of many nations.",
    ],
  },
  {
    name: "Joseph",
    clues: [
      "My father loved me more than my brothers.",
      "I received a special garment as a gift.",
      "I was sold by people I trusted.",
      "I was imprisoned in a foreign land for something I did not do.",
      "I interpreted dreams and rose to great power in Egypt.",
    ],
  },
  {
    name: "Esther",
    clues: [
      "I was an orphan raised by a relative.",
      "My beauty was noticed by many.",
      "I kept my background a secret for a time.",
      "I risked my life by appearing before the king uninvited.",
      "I helped save my people from a wicked plot.",
    ],
  },
  {
    name: "Noah",
    clues: [
      "I was described as righteous in my generation.",
      "God gave me a very unusual building project.",
      "My neighbors thought I was foolish.",
      "I gathered animals in pairs.",
      "I built an ark to survive a great flood.",
    ],
  },
  {
    name: "Paul",
    clues: [
      "I was highly educated in the law of my people.",
      "I once persecuted the very group I later joined.",
      "A blinding light changed the course of my life.",
      "I traveled extensively and was shipwrecked multiple times.",
      "I wrote many letters that became part of the Bible.",
    ],
  },
  {
    name: "Peter",
    clues: [
      "I was a fisherman by trade.",
      "I once tried to walk on water.",
      "I denied knowing my best friend three times.",
      "I was the first to preach to non-Jewish people.",
      "Jesus told me: 'I will give you the keys of the Kingdom.'",
    ],
  },
  {
    name: "Jonah",
    clues: [
      "I received an assignment from God that I did not want.",
      "I boarded a ship heading the opposite direction.",
      "A violent storm arose because of me.",
      "I was swallowed by a great fish.",
      "I eventually preached to the city of Nineveh.",
    ],
  },
  {
    name: "Samson",
    clues: [
      "I was dedicated to God from before birth.",
      "I had a special restriction about my appearance.",
      "I had extraordinary physical strength.",
      "I was betrayed by someone I loved.",
      "I brought down the pillars of a building as my final act.",
    ],
  },
  {
    name: "Sarah",
    clues: [
      "I traveled far from my homeland with my husband.",
      "I was considered very beautiful even in old age.",
      "I laughed at a promise that seemed impossible.",
      "I became a mother at a very old age.",
      "My son Isaac was the child of promise.",
    ],
  },
  {
    name: "Elijah",
    clues: [
      "I lived during a time of great unfaithfulness in Israel.",
      "I was fed by ravens during a famine.",
      "I challenged 450 false prophets in a dramatic contest.",
      "Fire came down from heaven at my prayer.",
      "I was taken up in a whirlwind without dying.",
    ],
  },
  {
    name: "Job",
    clues: [
      "I was known as the greatest man in the East.",
      "I lost everything I had in a single day.",
      "My friends came to comfort me but accused me instead.",
      "I maintained my integrity through intense suffering.",
      "God blessed me with double what I had before.",
    ],
  },
  {
    name: "Solomon",
    clues: [
      "My father was a famous king.",
      "I asked God for wisdom instead of riches.",
      "I settled a dispute between two women with a clever test.",
      "I built the first temple in Jerusalem.",
      "I am known as the wisest man who ever lived.",
    ],
  },
  {
    name: "Joshua",
    clues: [
      "I served as an assistant to a great leader for many years.",
      "I was one of only two spies who gave a good report.",
      "I led my people across a river on dry ground.",
      "I commanded the sun to stand still during a battle.",
      "I led the conquest of the Promised Land.",
    ],
  },
  {
    name: "Rahab",
    clues: [
      "I lived in a city with massive walls.",
      "I hid visitors on my rooftop.",
      "I hung a scarlet cord from my window.",
      "My city was destroyed but I survived.",
      "I became an ancestor of Jesus Christ.",
    ],
  },
  {
    name: "Timothy",
    clues: [
      "My mother and grandmother taught me the Scriptures from childhood.",
      "I was young when I received heavy responsibilities.",
      "An older mentor wrote letters of encouragement to me.",
      "I traveled widely as a companion of a well-known apostle.",
      "Paul called me his 'genuine child in the faith.'",
    ],
  },
  {
    name: "Jesus",
    clues: [
      "Angels announced my arrival.",
      "I grew up in Nazareth.",
      "I was baptized at about 30 years of age.",
      "I performed many miracles including raising the dead.",
      "I am the promised Messiah and King of God's Kingdom.",
    ],
  },
];

const DEFAULT_TOTAL_ROUNDS = 8;
const CLUES_PER_ROUND = 5;
const DEFAULT_POINTS_PER_CLUE = [100, 80, 60, 40, 20]; // More points for fewer clues needed

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildRounds(contentPack?: Props["contentPack"], totalRounds = DEFAULT_TOTAL_ROUNDS): CharacterData[] {
  let pool = CHARACTER_DATABASE;

  // If content pack has key people, prioritize those characters
  if (contentPack?.keyPeople && contentPack.keyPeople.length > 0) {
    const packNames = new Set(contentPack.keyPeople.map((n) => n.toLowerCase()));
    const matched = pool.filter((c) => packNames.has(c.name.toLowerCase()));
    const unmatched = pool.filter((c) => !packNames.has(c.name.toLowerCase()));

    // Put matched characters first, fill rest randomly
    pool = [...shuffle(matched), ...shuffle(unmatched)];
  } else {
    pool = shuffle(pool);
  }

  return pool.slice(0, totalRounds);
}

export default function WhoAmI({ gameId, userId, contentPack, ageGroup }: Props) {
  const { status, finalScore, startSession, endSession, reset } =
    useGameSession({ gameId, userId });
  const { discover } = useEncyclopedia();

  const difficulty = getDifficulty(ageGroup);
  const TOTAL_ROUNDS = difficulty === "easy" ? 4 : difficulty === "hard" ? 10 : DEFAULT_TOTAL_ROUNDS;
  const NUM_OPTIONS = difficulty === "easy" ? 2 : 4;
  const POINTS_PER_CLUE = difficulty === "hard"
    ? [80, 60, 40, 30, 15]
    : DEFAULT_POINTS_PER_CLUE;
  const START_CLUE_INDEX = difficulty === "easy" ? 1 : 0; // easy starts with 2 clues visible

  const [rounds, setRounds] = useState<CharacterData[]>(() =>
    buildRounds(contentPack, TOTAL_ROUNDS)
  );
  const [currentRound, setCurrentRound] = useState(0);
  const [clueIndex, setClueIndex] = useState(START_CLUE_INDEX);
  const [score, setScore] = useState(0);
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  const character = rounds[currentRound];

  // Build multiple choice options for the current round
  const options = useMemo(() => {
    if (!character) return [];
    const others = rounds
      .filter((_, i) => i !== currentRound)
      .map((c) => c.name);
    const wrongChoices = shuffle(others).slice(0, NUM_OPTIONS - 1);
    return shuffle([character.name, ...wrongChoices]);
  }, [character, rounds, currentRound, NUM_OPTIONS]);

  const visibleClues = character
    ? character.clues.slice(0, clueIndex + 1)
    : [];

  const handleGuess = useCallback(
    (selected: string) => {
      if (feedback) return; // Already answered

      if (selected === character.name) {
        const points = POINTS_PER_CLUE[clueIndex] ?? 20;
        setScore((s) => s + points);
        setFeedback("correct");
        // Encyclopedia discovery — try the character name
        discover(character.name, "who-am-i");
      } else {
        setFeedback("wrong");
        setShowAnswer(true);
      }
    },
    [character, clueIndex, feedback, discover, POINTS_PER_CLUE]
  );

  const handleNextClue = useCallback(() => {
    if (clueIndex < CLUES_PER_ROUND - 1) {
      setClueIndex((i) => i + 1);
    }
  }, [clueIndex]);

  const handleNextRound = useCallback(() => {
    const nextRound = currentRound + 1;
    if (nextRound >= TOTAL_ROUNDS) {
      endSession(score);
    } else {
      setCurrentRound(nextRound);
      setClueIndex(START_CLUE_INDEX);
      setGuess("");
      setFeedback(null);
      setShowAnswer(false);
    }
  }, [currentRound, score, endSession]);

  const handleRestart = useCallback(() => {
    setRounds(buildRounds(contentPack, TOTAL_ROUNDS));
    setCurrentRound(0);
    setClueIndex(START_CLUE_INDEX);
    setScore(0);
    setGuess("");
    setFeedback(null);
    setShowAnswer(false);
    reset();
  }, [contentPack, reset]);

  // Idle screen
  if (status === "idle") {
    return (
      <div className="text-center py-12">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
          Who Am I?
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-2 max-w-md mx-auto">
          Read the clues and guess the Bible character! Fewer clues means more
          points.
        </p>
        <p className="text-sm text-zinc-400 dark:text-zinc-500 mb-8">
          {TOTAL_ROUNDS} rounds &middot; Up to {POINTS_PER_CLUE[0]} points per
          round
        </p>
        <button
          onClick={startSession}
          className="px-8 py-3 bg-coral-600 text-white rounded-xl text-lg font-semibold hover:bg-coral-700 transition"
        >
          Start Game
        </button>
      </div>
    );
  }

  // Finished screen
  if (status === "finished") {
    const maxScore = TOTAL_ROUNDS * POINTS_PER_CLUE[0];
    const pct = Math.round(((finalScore ?? score) / maxScore) * 100);
    return (
      <>
      <Confetti active={status === "finished"} />
      <div className="text-center py-12">
        <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
          Game Over!
        </h2>
        <div className="text-6xl font-bold text-coral-600 dark:text-coral-400 mb-2">
          {finalScore ?? score}
        </div>
        <p className="text-zinc-500 dark:text-zinc-400 mb-1">
          out of {maxScore} possible points
        </p>
        <p className="text-sm text-zinc-400 dark:text-zinc-500 mb-8">
          {pct}% score
        </p>
        <button
          onClick={handleRestart}
          className="px-8 py-3 bg-coral-600 text-white rounded-xl text-lg font-semibold hover:bg-coral-700 transition"
        >
          Play Again
        </button>
      </div>
      </>
    );
  }

  // Playing screen
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Who Am I?
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-400 dark:text-zinc-500">
            Round {currentRound + 1}/{TOTAL_ROUNDS}
          </span>
          <span className="text-sm font-medium text-coral-600 dark:text-coral-400">
            {score} pts
          </span>
        </div>
      </div>

      {/* Clue area */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Clue {clueIndex + 1} of {CLUES_PER_ROUND}
          </h3>
          {!feedback && clueIndex < CLUES_PER_ROUND - 1 && (
            <button
              onClick={handleNextClue}
              className="text-sm text-coral-600 dark:text-coral-400 hover:underline"
            >
              Need another clue? (-{(POINTS_PER_CLUE[clueIndex] ?? 20) - (POINTS_PER_CLUE[clueIndex + 1] ?? 20)} pts)
            </button>
          )}
        </div>

        <div className="space-y-3">
          {visibleClues.map((clue, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 ${
                i === clueIndex
                  ? "text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-coral-100 dark:bg-coral-900/30 text-coral-700 dark:text-coral-300 text-xs flex items-center justify-center font-medium mt-0.5">
                {i + 1}
              </span>
              <p className="text-lg italic">&ldquo;{clue}&rdquo;</p>
            </div>
          ))}
        </div>

        {!feedback && (
          <p className="mt-4 text-sm text-zinc-400 dark:text-zinc-500 text-right">
            Worth {POINTS_PER_CLUE[clueIndex] ?? 20} points at this clue
          </p>
        )}
      </div>

      {/* Answer options */}
      {!feedback ? (
        <div className="grid grid-cols-2 gap-3">
          {options.map((option) => {
            const OptionIcon = getIconForConcept(option);
            return (
              <button
                key={option}
                onClick={() => handleGuess(option)}
                className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 font-medium hover:border-coral-300 dark:hover:border-coral-700 hover:shadow-md transition text-lg inline-flex items-center justify-center gap-2"
              >
                {OptionIcon && <OptionIcon size={28} />}
                {option}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-center">
          <div
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-lg font-semibold mb-4 ${
              feedback === "correct"
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
            }`}
          >
            {feedback === "correct" ? (
              <>Correct! It was {character.name}. +{POINTS_PER_CLUE[clueIndex] ?? 20} pts</>
            ) : (
              <>Wrong! It was {character.name}.</>
            )}
          </div>
          <div>
            <button
              onClick={handleNextRound}
              className="px-8 py-3 bg-coral-600 text-white rounded-xl font-semibold hover:bg-coral-700 transition"
            >
              {currentRound + 1 >= TOTAL_ROUNDS ? "See Results" : "Next Round"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
