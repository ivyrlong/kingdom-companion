"use client";

import { useEffect, useRef, useCallback } from "react";

interface ConfettiProps {
  /** Whether to fire confetti right now */
  active: boolean;
  /** Duration in ms before confetti fades (default 3000) */
  duration?: number;
  /** Number of pieces (default 80) */
  count?: number;
}

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

// Faithful Companion palette colors for confetti
const COLORS = [
  "#FF8269", // cheerful coral
  "#75CFF0", // spiritual sky
  "#F3B840", // golden promise
  "#AC94F4", // faithful violet
  "#FFD5B7", // joyful peach
  "#FF9B87", // coral light
  "#4ABDE8", // sky dark
  "#E5A320", // golden dark
];

export default function Confetti({
  active,
  duration = 3000,
  count = 80,
}: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const piecesRef = useRef<Piece[]>([]);
  const animRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  const spawn = useCallback(() => {
    const pieces: Piece[] = [];
    for (let i = 0; i < count; i++) {
      pieces.push({
        x: Math.random() * window.innerWidth,
        y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 4 + 2,
        w: Math.random() * 8 + 4,
        h: Math.random() * 6 + 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
      });
    }
    return pieces;
  }, [count]);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    piecesRef.current = spawn();
    startRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const fadeStart = duration * 0.6;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = false;
      for (const p of piecesRef.current) {
        // Physics
        p.x += p.vx;
        p.vy += 0.12; // gravity
        p.y += p.vy;
        p.vx *= 0.99; // air resistance
        p.rotation += p.rotationSpeed;

        // Fade out
        if (elapsed > fadeStart) {
          p.opacity = Math.max(0, 1 - (elapsed - fadeStart) / (duration - fadeStart));
        }

        if (p.y < canvas.height + 50 && p.opacity > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = p.opacity;
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      }

      if (alive && elapsed < duration) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    animRef.current = requestAnimationFrame(animate);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [active, duration, spawn]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 9999 }}
    />
  );
}
