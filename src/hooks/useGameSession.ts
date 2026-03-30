"use client";

import { useState, useCallback } from "react";

interface UseGameSessionOptions {
  gameId: string;
  userId?: string;
}

export function useGameSession({ gameId, userId }: UseGameSessionOptions) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "playing" | "finished">("idle");
  const [finalScore, setFinalScore] = useState<number | null>(null);

  const startSession = useCallback(async () => {
    if (!userId) {
      setStatus("playing");
      return;
    }

    try {
      const res = await fetch("/api/games/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId }),
      });
      if (res.ok) {
        const data = await res.json();
        setSessionId(data.sessionId);
      }
    } catch {
      // Continue without session tracking
    }
    setStatus("playing");
  }, [gameId, userId]);

  const endSession = useCallback(
    async (score: number) => {
      setFinalScore(score);
      setStatus("finished");

      if (!userId || !sessionId) return;

      try {
        await fetch("/api/games/session", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, score }),
        });
      } catch {
        // Score save failed silently
      }
    },
    [userId, sessionId]
  );

  const reset = useCallback(() => {
    setSessionId(null);
    setStatus("idle");
    setFinalScore(null);
  }, []);

  return { status, finalScore, startSession, endSession, reset };
}
