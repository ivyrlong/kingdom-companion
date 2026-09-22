/**
 * Deterministic, seedable maze generator.
 *
 * Uses recursive backtracking on a grid of cells, each with N/E/S/W wall
 * flags. Randomness is Mulberry32 (32-bit, fast, seed-stable across runs
 * so every player on a given seed gets the same maze).
 *
 * Kept dependency-free — the algorithm is ~50 lines and open-source libs
 * add bundle weight, supply-chain surface, and API-drift risk for zero
 * upside on a puzzle this small.
 */

export interface MazeCell {
  x: number;
  y: number;
  /** Walls that still exist on each side of this cell. */
  walls: { n: boolean; e: boolean; s: boolean; w: boolean };
}

export interface Maze {
  width: number;
  height: number;
  cells: MazeCell[]; // indexed as y*width + x
  start: { x: number; y: number };
  end: { x: number; y: number };
}

/** Deterministic PRNG: same seed → same sequence. */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash an arbitrary string to a 32-bit seed. */
export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Recursive backtracker maze generation. Starts from (0,0), carves
 * corridors until every cell is visited, then places start in the
 * upper-left and end in the lower-right.
 */
export function generateMaze(
  width: number,
  height: number,
  seed: number,
): Maze {
  const rng = mulberry32(seed);
  const cells: MazeCell[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      cells.push({
        x,
        y,
        walls: { n: true, e: true, s: true, w: true },
      });
    }
  }

  const idx = (x: number, y: number) => y * width + x;
  const visited = new Uint8Array(width * height);
  const stack: Array<{ x: number; y: number }> = [{ x: 0, y: 0 }];
  visited[0] = 1;

  const dirs: Array<{
    dx: number;
    dy: number;
    thisWall: keyof MazeCell["walls"];
    neighborWall: keyof MazeCell["walls"];
  }> = [
    { dx: 0, dy: -1, thisWall: "n", neighborWall: "s" },
    { dx: 1, dy: 0, thisWall: "e", neighborWall: "w" },
    { dx: 0, dy: 1, thisWall: "s", neighborWall: "n" },
    { dx: -1, dy: 0, thisWall: "w", neighborWall: "e" },
  ];

  while (stack.length > 0) {
    const cur = stack[stack.length - 1];
    // Unvisited neighbors within bounds.
    const options = dirs.filter(({ dx, dy }) => {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      return (
        nx >= 0 &&
        nx < width &&
        ny >= 0 &&
        ny < height &&
        !visited[idx(nx, ny)]
      );
    });
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    // Pick a random unvisited neighbor and carve the wall between them.
    const pick = options[Math.floor(rng() * options.length)];
    const nx = cur.x + pick.dx;
    const ny = cur.y + pick.dy;
    cells[idx(cur.x, cur.y)].walls[pick.thisWall] = false;
    cells[idx(nx, ny)].walls[pick.neighborWall] = false;
    visited[idx(nx, ny)] = 1;
    stack.push({ x: nx, y: ny });
  }

  return {
    width,
    height,
    cells,
    start: { x: 0, y: 0 },
    end: { x: width - 1, y: height - 1 },
  };
}

/**
 * Can the player move from (x,y) in the given direction? True iff the
 * shared wall between them is carved. Caller is responsible for bounds.
 */
export function canMove(
  maze: Maze,
  x: number,
  y: number,
  dir: "n" | "e" | "s" | "w",
): boolean {
  if (x < 0 || x >= maze.width || y < 0 || y >= maze.height) return false;
  const c = maze.cells[y * maze.width + x];
  if (c.walls[dir]) return false;
  const dx = dir === "e" ? 1 : dir === "w" ? -1 : 0;
  const dy = dir === "s" ? 1 : dir === "n" ? -1 : 0;
  const nx = x + dx;
  const ny = y + dy;
  return nx >= 0 && nx < maze.width && ny >= 0 && ny < maze.height;
}
