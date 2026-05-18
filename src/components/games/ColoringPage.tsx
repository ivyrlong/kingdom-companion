"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useGameSession } from "@/hooks/useGameSession";
import Confetti from "@/components/Confetti";

/* ── Types ──────────────────────────────────────────────────────────── */

interface ColoringPageProps {
  gameId: string;
  userId?: string;
  ageGroup?: "LITTLE_ONES" | "YOUTH" | "ADULT" | "FAMILY";
  imageUrl?: string;
  contentPackTitle?: string;
}

interface SVGRegion {
  id: string;
  tagName: string;
  attrs: Record<string, string>;
  stroke: string;
}

/* ── Palette ────────────────────────────────────────────────────────── */

const PALETTE = [
  { name: "Coral", hex: "#FF8269" },
  { name: "Sky", hex: "#75CFF0" },
  { name: "Golden", hex: "#F3B840" },
  { name: "Violet", hex: "#AC94F4" },
  { name: "Peach", hex: "#FFD5B7" },
  { name: "Red", hex: "#E74C3C" },
  { name: "Green", hex: "#27AE60" },
  { name: "Brown", hex: "#8B5E3C" },
  { name: "Pink", hex: "#FF6B9D" },
  { name: "Teal", hex: "#1ABC9C" },
  { name: "Navy", hex: "#2C3E7A" },
  { name: "Orange", hex: "#E67E22" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Black", hex: "#1A1A1A" },
];

/* ── Main Component ─────────────────────────────────────────────────── */

export default function ColoringPage({
  gameId,
  userId,
  ageGroup,
  imageUrl,
  contentPackTitle,
}: ColoringPageProps) {
  const { status, finalScore, startSession, endSession, reset } =
    useGameSession({ gameId, userId });

  const isLittleOnes = ageGroup === "LITTLE_ONES";
  const isSvg = imageUrl?.endsWith(".svg");
  const useFloodFill = isLittleOnes && isSvg;

  const [selectedColor, setSelectedColor] = useState(PALETTE[0].hex);

  if (!imageUrl) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-3">
          Coloring Page
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400">
          No coloring page image is available for this content pack. Upload one
          in the admin image library.
        </p>
      </div>
    );
  }

  /* ── Idle screen ──────────────────────────────────────────────────── */

  if (status === "idle") {
    return (
      <div className="text-center py-16 space-y-6">
        <div className="w-20 h-20 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center mx-auto">
          <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
            <rect x="8" y="8" width="32" height="32" rx="4" fill="#AC94F4" />
            <circle cx="20" cy="20" r="4" fill="#F3B840" />
            <circle cx="30" cy="18" r="3" fill="#FF8269" />
            <circle cx="24" cy="30" r="5" fill="#75CFF0" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Coloring Page
        </h2>
        {contentPackTitle && (
          <p className="text-sm text-coral-600 dark:text-coral-400">
            {contentPackTitle}
          </p>
        )}
        <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
          {useFloodFill
            ? "Tap on each area to fill it with beautiful colors! Choose your color, then tap to paint."
            : "Use your finger or mouse to draw and color. Pick colors, change brush size, and bring the picture to life!"}
        </p>
        <button
          onClick={startSession}
          className="px-8 py-3 bg-coral-600 hover:bg-coral-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition"
        >
          Start Coloring
        </button>
      </div>
    );
  }

  /* ── Finished screen ──────────────────────────────────────────────── */

  if (status === "finished") {
    return (
      <div className="text-center py-16 space-y-6">
        <Confetti active duration={4000} />
        <h2 className="text-3xl font-bold text-coral-600">
          Beautiful Work!
        </h2>
        <p className="text-lg text-zinc-600 dark:text-zinc-300">
          Score: <span className="font-bold text-coral-600">{finalScore}</span>
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-coral-600 hover:bg-coral-700 text-white font-medium rounded-lg transition"
          >
            Color Again
          </button>
        </div>
      </div>
    );
  }

  /* ── Playing ──────────────────────────────────────────────────────── */

  return (
    <div className="space-y-4">
      {/* Color palette */}
      <ColorPaletteBar
        selected={selectedColor}
        onSelect={setSelectedColor}
      />

      {useFloodFill ? (
        <SVGColoringMode
          imageUrl={imageUrl}
          selectedColor={selectedColor}
          onFinish={(score) => endSession(score)}
        />
      ) : (
        <CanvasColoringMode
          imageUrl={imageUrl}
          selectedColor={selectedColor}
          ageGroup={ageGroup}
          onFinish={(score) => endSession(score)}
        />
      )}
    </div>
  );
}

/* ── Color Palette Bar ──────────────────────────────────────────────── */

function ColorPaletteBar({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (hex: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-2 px-1 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
      {PALETTE.map((c) => (
        <button
          key={c.hex}
          title={c.name}
          onClick={() => onSelect(c.hex)}
          className={`shrink-0 w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 ${
            selected === c.hex
              ? "border-zinc-900 dark:border-white scale-110 shadow-md"
              : "border-zinc-300 dark:border-zinc-600"
          }`}
          style={{
            backgroundColor: c.hex,
            boxShadow: c.hex === "#FFFFFF" ? "inset 0 0 0 1px #d4d4d8" : undefined,
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SVG COLORING MODE (Little Ones — tap to fill regions)
   ═══════════════════════════════════════════════════════════════════════ */

function SVGColoringMode({
  imageUrl,
  selectedColor,
  onFinish,
}: {
  imageUrl: string;
  selectedColor: string;
  onFinish: (score: number) => void;
}) {
  const [regions, setRegions] = useState<SVGRegion[]>([]);
  const [viewBox, setViewBox] = useState("0 0 800 600");
  const [fills, setFills] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  // Parse SVG on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(imageUrl);
        const text = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "image/svg+xml");
        const svg = doc.querySelector("svg");
        if (!svg || cancelled) return;

        setViewBox(svg.getAttribute("viewBox") || "0 0 800 600");

        const shapeTags = ["path", "polygon", "circle", "ellipse", "rect"];
        const extracted: SVGRegion[] = [];
        let idx = 0;

        function traverse(el: Element, parentTransform: string) {
          const transform = el.getAttribute("transform");
          const combinedTransform = [parentTransform, transform].filter(Boolean).join(" ");

          for (const child of Array.from(el.children)) {
            if (child.tagName === "g") {
              traverse(child, combinedTransform);
              continue;
            }
            if (!shapeTags.includes(child.tagName)) continue;

            // Skip shapes that are just strokes (the outlines themselves)
            const fill = child.getAttribute("fill");
            const stroke = child.getAttribute("stroke") || "#000000";
            if (fill === "none" && !child.getAttribute("stroke-width")) continue;

            const attrs: Record<string, string> = {};
            for (const attr of Array.from(child.attributes)) {
              if (attr.name !== "fill" && attr.name !== "style") {
                attrs[attr.name] = attr.value;
              }
            }
            if (combinedTransform) attrs.transform = combinedTransform;

            extracted.push({
              id: `region-${idx++}`,
              tagName: child.tagName,
              attrs,
              stroke,
            });
          }
        }

        traverse(svg, "");
        setRegions(extracted);
      } catch {
        /* failed to load */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [imageUrl]);

  const handleClick = useCallback(
    (id: string) => {
      setFills((prev) => {
        const next = new Map(prev);
        next.set(id, selectedColor);
        return next;
      });
    },
    [selectedColor],
  );

  const filledCount = fills.size;
  const totalRegions = regions.length;
  const progress = totalRegions > 0 ? Math.round((filledCount / totalRegions) * 100) : 0;

  const handleSave = useCallback(() => {
    // Render SVG to canvas for download
    const svgEl = document.getElementById("coloring-svg");
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coloring-page-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin h-8 w-8 mx-auto border-4 border-coral-600 border-t-transparent rounded-full" />
        <p className="text-zinc-500 dark:text-zinc-400 mt-3">Loading coloring page...</p>
      </div>
    );
  }

  if (regions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500 dark:text-zinc-400">
          This SVG doesn&apos;t have fillable regions. Try uploading an SVG with separate path elements.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-3 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-coral-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300 tabular-nums">
          {filledCount}/{totalRegions}
        </span>
        <button
          onClick={handleSave}
          className="px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition"
        >
          Save
        </button>
        {filledCount >= totalRegions && (
          <button
            onClick={() => onFinish(totalRegions * 10)}
            className="px-4 py-1.5 text-sm bg-coral-600 hover:bg-coral-700 text-white font-medium rounded-lg transition"
          >
            Finish
          </button>
        )}
      </div>

      {/* SVG canvas */}
      <div className="bg-white rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <svg
          id="coloring-svg"
          viewBox={viewBox}
          className="w-full h-auto"
          style={{ maxHeight: "70vh" }}
        >
          {/* White background */}
          <rect width="100%" height="100%" fill="white" />

          {regions.map((region) => {
            const fill = fills.get(region.id) || "#FFFFFF";
            const Tag = region.tagName as keyof React.JSX.IntrinsicElements;
            return (
              <Tag
                key={region.id}
                {...region.attrs}
                fill={fill}
                stroke={region.stroke}
                strokeWidth={region.attrs["stroke-width"] || "2"}
                onClick={() => handleClick(region.id)}
                style={{ cursor: "pointer" }}
                className="hover:opacity-80 transition-opacity"
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   CANVAS COLORING MODE (Youth/Adult — freehand drawing)
   ═══════════════════════════════════════════════════════════════════════ */

function CanvasColoringMode({
  imageUrl,
  selectedColor,
  ageGroup,
  onFinish,
}: {
  imageUrl: string;
  selectedColor: string;
  ageGroup?: string;
  onFinish: (score: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<"brush" | "eraser">("brush");
  const [brushSize, setBrushSize] = useState(12);
  const [opacity, setOpacity] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [outlineImg, setOutlineImg] = useState<HTMLImageElement | null>(null);

  // Undo/redo history
  const historyRef = useRef<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [historyLength, setHistoryLength] = useState(0);

  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const showOpacity = ageGroup === "ADULT";
  const maxBrushSize = ageGroup === "ADULT" ? 60 : ageGroup === "YOUTH" ? 40 : 30;
  const minBrushSize = 2;

  // Load the outline image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setOutlineImg(img);
    img.src = imageUrl;
    return () => {
      img.onload = null;
      img.src = "";
    };
  }, [imageUrl]);

  // Initialize canvas when image loads
  useEffect(() => {
    if (!outlineImg || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const dpr = window.devicePixelRatio || 1;

    // Size canvas to container width, maintain aspect ratio
    const containerWidth = container.clientWidth;
    const aspect = outlineImg.height / outlineImg.width;
    const displayWidth = containerWidth;
    const displayHeight = containerWidth * aspect;

    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, displayWidth, displayHeight);
      // Save initial state
      saveHistory();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outlineImg]);

  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistoryIndex((prev) => {
      const idx = prev + 1;
      historyRef.current = historyRef.current.slice(0, idx);
      historyRef.current.push(data);
      if (historyRef.current.length > 15) {
        historyRef.current.shift();
        const newIdx = historyRef.current.length - 1;
        setHistoryLength(historyRef.current.length);
        return newIdx;
      }
      setHistoryLength(historyRef.current.length);
      return idx;
    });
  }, []);

  const undo = useCallback(() => {
    setHistoryIndex((prev) => {
      if (prev <= 0) return prev;
      const newIdx = prev - 1;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx) ctx.putImageData(historyRef.current[newIdx], 0, 0);
      return newIdx;
    });
  }, []);

  const redo = useCallback(() => {
    setHistoryIndex((prev) => {
      if (prev >= historyRef.current.length - 1) return prev;
      const newIdx = prev + 1;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx) ctx.putImageData(historyRef.current[newIdx], 0, 0);
      return newIdx;
    });
  }, []);

  const getCanvasPoint = useCallback(
    (e: React.PointerEvent): { x: number; y: number } => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    [],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.setPointerCapture(e.pointerId);

      const point = getCanvasPoint(e);
      lastPointRef.current = point;
      setIsDrawing(true);

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = opacity;
      }
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Draw a dot
      ctx.beginPath();
      ctx.arc(point.x, point.y, brushSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = tool === "eraser" ? "#000" : selectedColor;
      ctx.fill();
      ctx.restore();
    },
    [tool, selectedColor, brushSize, opacity, getCanvasPoint],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing || !lastPointRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const point = getCanvasPoint(e);
      const dpr = window.devicePixelRatio || 1;

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.globalAlpha = 1;
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = opacity;
      }
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      ctx.restore();

      lastPointRef.current = point;
    },
    [isDrawing, tool, selectedColor, brushSize, opacity, getCanvasPoint],
  );

  const handlePointerUp = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false);
      lastPointRef.current = null;
      saveHistory();
    }
  }, [isDrawing, saveHistory]);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !outlineImg) return;

    // Composite: drawing + outline
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    // Draw the user's coloring
    ctx.drawImage(canvas, 0, 0);

    // Overlay the outline with multiply
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(outlineImg, 0, 0, canvas.width, canvas.height);

    const link = document.createElement("a");
    link.download = `coloring-page-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
  }, [outlineImg]);

  if (!outlineImg) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin h-8 w-8 mx-auto border-4 border-coral-600 border-t-transparent rounded-full" />
        <p className="text-zinc-500 dark:text-zinc-400 mt-3">Loading coloring page...</p>
      </div>
    );
  }

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyLength - 1;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2">
        {/* Brush / Eraser */}
        <button
          onClick={() => setTool("brush")}
          className={`px-3 py-1.5 text-sm rounded-lg transition ${
            tool === "brush"
              ? "bg-coral-600 text-white"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200"
          }`}
        >
          Brush
        </button>
        <button
          onClick={() => setTool("eraser")}
          className={`px-3 py-1.5 text-sm rounded-lg transition ${
            tool === "eraser"
              ? "bg-coral-600 text-white"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200"
          }`}
        >
          Eraser
        </button>

        <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-700 mx-1" />

        {/* Brush size */}
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          Size
          <input
            type="range"
            min={minBrushSize}
            max={maxBrushSize}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-24 accent-coral-600"
          />
          <span className="text-xs tabular-nums w-6 text-right">{brushSize}</span>
        </label>

        {/* Opacity (Adult only) */}
        {showOpacity && (
          <>
            <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-700 mx-1" />
            <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
              Opacity
              <input
                type="range"
                min={10}
                max={100}
                value={Math.round(opacity * 100)}
                onChange={(e) => setOpacity(Number(e.target.value) / 100)}
                className="w-20 accent-violet-600"
              />
              <span className="text-xs tabular-nums w-8 text-right">
                {Math.round(opacity * 100)}%
              </span>
            </label>
          </>
        )}

        <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-700 mx-1" />

        {/* Undo / Redo */}
        <button
          onClick={undo}
          disabled={!canUndo}
          className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition"
          title="Undo"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-9-9H3" />
          </svg>
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition"
          title="Redo"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 0 1 9-9h9" />
          </svg>
        </button>

        <div className="flex-1" />

        {/* Save & Finish */}
        <button
          onClick={handleSave}
          className="px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition"
        >
          Save
        </button>
        <button
          onClick={() => onFinish(200)}
          className="px-4 py-1.5 text-sm bg-coral-600 hover:bg-coral-700 text-white font-medium rounded-lg transition"
        >
          Finish
        </button>
      </div>

      {/* Canvas + outline overlay */}
      <div
        ref={containerRef}
        className="relative bg-white rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
        style={{ touchAction: "none" }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="block w-full cursor-crosshair"
          style={{ touchAction: "none" }}
        />
        {/* Outline overlay — always visible on top */}
        {outlineImg && (
          <img
            src={imageUrl}
            alt="Outline"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            style={{ mixBlendMode: "multiply" }}
          />
        )}
      </div>

      {/* Brush preview */}
      <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
        <span>Preview:</span>
        <div
          className="rounded-full border border-zinc-300"
          style={{
            width: brushSize,
            height: brushSize,
            backgroundColor: tool === "eraser" ? "transparent" : selectedColor,
            minWidth: 4,
            minHeight: 4,
            backgroundImage:
              tool === "eraser"
                ? "repeating-conic-gradient(#ccc 0% 25%, transparent 0% 50%)"
                : undefined,
            backgroundSize: tool === "eraser" ? "8px 8px" : undefined,
            opacity: opacity,
          }}
        />
      </div>
    </div>
  );
}
