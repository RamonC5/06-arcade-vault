'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { hexToRgba } from '@/lib/skins';
import type { GameAction, GameInput } from '@/lib/gameInput';

interface SnakeGameProps {
  paused: boolean;
  skinKey?: string;
  onScoreChange: (score: number) => void;
  onLevelChange: (level: number) => void;
  onLivesChange: (lives: number) => void;
  onGameOver: (finalScore: number) => void;
  /** Imperative handle for the touch controls; the keyboard path keeps working without it. */
  inputRef?: RefObject<GameInput | null>;
}

// ── Skins ─────────────────────────────────────────────────────────────────────

/**
 * A skin is palette *and* drawing technique. Besides the eight colors, it owns
 * the shape knobs (corner radius, padding, tail alpha ramp) and `glow`, which
 * drives `shadowBlur`. Everything the canvas paints — grid and in-canvas HUD
 * included — comes from here; no color literal is left in `draw()`.
 */
type Skin = {
  name: string;
  /** Board background. Never perceptibly lighter than the site's `--bg`. */
  bg: string;
  grid: string;
  gridAlpha: number;
  gridWidth: number;
  head: string;
  body: string;
  /** Eye dot, drawn on top of the head — read against `head`, never against `bg`. */
  eye: string;
  eyeRadius: number;
  /** Translucent strip behind the in-canvas HUD text. */
  hudBar: string;
  hudBarAlpha: number;
  hudScore: string;
  hudLevel: string;
  hudFont: string;
  headPad: number;
  bodyPad: number;
  headRadius: number;
  bodyRadius: number;
  /** Alpha of the segment right behind the head. */
  tailAlpha: number;
  /** Alpha lost per segment towards the tail. */
  tailFade: number;
  /** Floor for the tail ramp, so the last segments stay legible. */
  tailMinAlpha: number;
  /** `shadowBlur` in px; 0 disables the glow entirely. */
  glow: number;
};

const SKINS: Record<string, Skin> = {
  // Literal freeze of the original palette: green snake on a dark green board.
  // Every value here is one of the nine literals `draw()` used to hardcode, so
  // the refactor is neutral to the pixel. If anything looks different, it's a bug.
  clasico: {
    name: 'Clásico',
    bg: '#0a1a0a',
    grid: '#00ff50',
    gridAlpha: 0.06,
    gridWidth: 1,
    head: '#00ff50',
    body: '#00cc40',
    eye: '#001a00',
    eyeRadius: 3.5,
    hudBar: '#000000',
    hudBarAlpha: 0.55,
    hudScore: '#00ff80',
    hudLevel: '#80ffcc',
    hudFont: 'bold 14px monospace',
    headPad: 2,
    bodyPad: 4,
    headRadius: 6,
    bodyRadius: 4,
    tailAlpha: 1,
    tailFade: 0.03,
    tailMinAlpha: 0.4,
    glow: 0,
  },
  // Dual-phosphor arcade tube: amber snake over a dim green graticule. Hard
  // corners, no glow and a uniform body (a phosphor tube has no alpha ramp).
  // The graticule sits 74° of hue away from the snake so the two never blend.
  retro: {
    name: 'Retro',
    bg: '#0a0703',
    grid: '#4a6b43',
    gridAlpha: 1,
    gridWidth: 1,
    head: '#ffdf9b',
    body: '#d68e24',
    eye: '#241703',
    eyeRadius: 3.5,
    hudBar: '#000000',
    hudBarAlpha: 0.6,
    hudScore: '#ffb000',
    hudLevel: '#7fd06a',
    hudFont: 'bold 14px monospace',
    headPad: 2,
    bodyPad: 3,
    headRadius: 1,
    bodyRadius: 0,
    tailAlpha: 1,
    tailFade: 0,
    tailMinAlpha: 1,
    glow: 0,
  },
  // Arcade Vault identity: house tokens with `shadowBlur`. Yellow head over a
  // green body keeps the snake reading as a snake while putting 90° of hue
  // between the two ends; the eyes are punched out in the board color.
  neon: {
    name: 'Neon',
    bg: '#05050a',
    grid: '#00f5ff',
    gridAlpha: 0.42,
    gridWidth: 1,
    head: '#f5ff00',
    body: '#00ff88',
    eye: '#05050a',
    eyeRadius: 3.5,
    hudBar: '#000000',
    hudBarAlpha: 0.6,
    hudScore: '#00f5ff',
    hudLevel: '#ff006e',
    hudFont: 'bold 14px monospace',
    headPad: 2,
    bodyPad: 4,
    headRadius: 8,
    bodyRadius: 6,
    tailAlpha: 0.85,
    tailFade: 0.02,
    tailMinAlpha: 0.7,
    glow: 12,
  },
};

// ── Constants ─────────────────────────────────────────────────────────────────

const COLS = 20;
const ROWS = 20;
const CELL = 40;
const W = COLS * CELL;
const H = ROWS * CELL;
const BASE_MS = 150;
const SPEED_REDUCTION = 10;
const FRUITS_PER_LEVEL = 5;

// ── Fruit atlas (from references/source-assets/snake-assets/sprites.js) ──────

const FRUIT_SPRITES = [
  { x: 34, y: 136, w: 110, h: 160 }, // banana
  { x: 186, y: 136, w: 150, h: 160 }, // orange
  { x: 378, y: 136, w: 110, h: 160 }, // grape
  { x: 540, y: 136, w: 130, h: 160 }, // garlic
  { x: 712, y: 136, w: 130, h: 160 }, // eggplant
  { x: 894, y: 136, w: 110, h: 160 }, // strawberry
  { x: 1066, y: 136, w: 110, h: 160 }, // cherry
  { x: 1228, y: 136, w: 130, h: 160 }, // carrot
  { x: 1400, y: 136, w: 130, h: 160 }, // mushroom
  { x: 1582, y: 136, w: 110, h: 160 }, // broccoli
  { x: 1734, y: 136, w: 150, h: 160 }, // watermelon
  { x: 1906, y: 136, w: 150, h: 160 }, // pepper
  { x: 2068, y: 136, w: 170, h: 160 }, // kiwi
  { x: 2250, y: 136, w: 140, h: 160 }, // lemon
  { x: 2432, y: 136, w: 130, h: 160 }, // peach
  { x: 2604, y: 136, w: 130, h: 160 }, // peanut
  { x: 2786, y: 136, w: 110, h: 160 }, // apple
  { x: 2948, y: 136, w: 130, h: 160 }, // tomato
  { x: 3110, y: 136, w: 150, h: 160 }, // berries
  { x: 3302, y: 136, w: 110, h: 160 }, // grapes2
  { x: 3454, y: 136, w: 150, h: 160 }, // pineapple
  { x: 3637, y: 136, w: 130, h: 160 }, // melon
];

// ── Types ─────────────────────────────────────────────────────────────────────

type Point = { x: number; y: number };

interface GameState {
  snake: Point[];
  dir: Point;
  nextDir: Point;
  fruit: { pos: Point; spriteIdx: number };
  score: number;
  level: number;
  fruitsEaten: number;
  dead: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function randomFruit(snake: Point[]): { pos: Point; spriteIdx: number } {
  let pos: Point;
  do {
    pos = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
  return { pos, spriteIdx: Math.floor(Math.random() * FRUIT_SPRITES.length) };
}

function initialState(): GameState {
  const snake: Point[] = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ];
  const dir = { x: 1, y: 0 };
  return {
    snake,
    dir,
    nextDir: dir,
    fruit: randomFruit(snake),
    score: 0,
    level: 1,
    fruitsEaten: 0,
    dead: false,
  };
}

function intervalMs(level: number): number {
  return Math.max(50, BASE_MS - (level - 1) * SPEED_REDUCTION);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SnakeGame({
  paused,
  skinKey = 'clasico',
  onScoreChange,
  onLevelChange,
  onLivesChange,
  onGameOver,
  inputRef,
}: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  const skinRef = useRef<Skin>(SKINS[skinKey] ?? SKINS.clasico);
  const stateRef = useRef<GameState>(initialState());
  const prevScoreRef = useRef(0);
  const prevLevelRef = useRef(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const deadFiredRef = useRef(false);
  // Set by the loop effect once the sprite sheet is ready, so a skin change can
  // repaint immediately instead of waiting for the next tick.
  const redrawRef = useRef<(() => void) | null>(null);

  // Sync paused ref so the loop reads the latest value without re-mounting.
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Swapping the skin only repoints a ref: the loop effect never re-runs, so the
  // snake, the score and the level all survive the change. The extra repaint
  // makes the swap visible while paused or after game over, when no tick runs.
  useEffect(() => {
    skinRef.current = SKINS[skinKey] ?? SKINS.clasico;
    redrawRef.current?.();
  }, [skinKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    // ── Image load ──────────────────────────────────────────────────────────
    const img = new Image();
    imgRef.current = img;
    let alive = true;

    img.onload = () => {
      if (!alive) return;
      redrawRef.current = draw;
      startLoop();
    };
    img.src = '/fruits.png';

    // ── Draw ────────────────────────────────────────────────────────────────
    function draw() {
      const s = stateRef.current;
      // Active skin, re-read once per frame: the loop effect never restarts.
      const skin = skinRef.current;
      ctx.clearRect(0, 0, W, H);

      // Background
      ctx.fillStyle = skin.bg;
      ctx.fillRect(0, 0, W, H);

      // Grid lines
      ctx.strokeStyle = hexToRgba(skin.grid, skin.gridAlpha);
      ctx.lineWidth = skin.gridWidth;
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * CELL, 0);
        ctx.lineTo(c * CELL, H);
        ctx.stroke();
      }
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * CELL);
        ctx.lineTo(W, r * CELL);
        ctx.stroke();
      }

      // Snake body
      s.snake.forEach((seg, i) => {
        const isHead = i === 0;
        const alpha = isHead
          ? 1
          : Math.max(skin.tailMinAlpha, skin.tailAlpha - i * skin.tailFade);
        ctx.globalAlpha = alpha;
        const color = isHead ? skin.head : skin.body;
        ctx.fillStyle = color;
        if (skin.glow) {
          ctx.shadowBlur = skin.glow;
          ctx.shadowColor = color;
        }
        const pad = isHead ? skin.headPad : skin.bodyPad;
        ctx.beginPath();
        ctx.roundRect(
          seg.x * CELL + pad,
          seg.y * CELL + pad,
          CELL - pad * 2,
          CELL - pad * 2,
          isHead ? skin.headRadius : skin.bodyRadius,
        );
        ctx.fill();
        // Drop the glow before the eyes: a halo on a dark dot only smears it.
        ctx.shadowBlur = 0;

        // Head eyes
        if (isHead) {
          ctx.fillStyle = skin.eye;
          const d = s.dir;
          const ex = seg.x * CELL + CELL / 2 + d.x * 8;
          const ey = seg.y * CELL + CELL / 2 + d.y * 8;
          const ox = d.y * 7;
          const oy = d.x * 7;
          ctx.beginPath();
          ctx.arc(ex + ox, ey - oy, skin.eyeRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(ex - ox, ey + oy, skin.eyeRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;

      // Fruit sprite
      const sp = FRUIT_SPRITES[s.fruit.spriteIdx];
      const fx = s.fruit.pos.x * CELL;
      const fy = s.fruit.pos.y * CELL;
      const padding = 4;
      ctx.drawImage(
        img,
        sp.x,
        sp.y,
        sp.w,
        sp.h,
        fx + padding,
        fy + padding,
        CELL - padding * 2,
        CELL - padding * 2,
      );

      // HUD overlay
      ctx.fillStyle = hexToRgba(skin.hudBar, skin.hudBarAlpha);
      ctx.fillRect(0, 0, W, 38);

      ctx.font = skin.hudFont;
      ctx.textBaseline = 'middle';

      ctx.fillStyle = skin.hudScore;
      ctx.textAlign = 'left';
      ctx.fillText(`SCORE  ${String(s.score).padStart(6, '0')}`, 12, 19);

      ctx.fillStyle = skin.hudLevel;
      ctx.textAlign = 'right';
      ctx.fillText(`LEVEL  ${String(s.level).padStart(2, '0')}`, W - 12, 19);

      ctx.textAlign = 'left';
    }

    // ── Update ──────────────────────────────────────────────────────────────
    function update() {
      const s = stateRef.current;
      if (s.dead) return;

      s.dir = s.nextDir;
      const head = s.snake[0];
      const newHead: Point = { x: head.x + s.dir.x, y: head.y + s.dir.y };

      // Wall collision
      if (
        newHead.x < 0 ||
        newHead.x >= COLS ||
        newHead.y < 0 ||
        newHead.y >= ROWS
      ) {
        triggerDeath();
        return;
      }

      // Self collision
      if (s.snake.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
        triggerDeath();
        return;
      }

      const ateFreuit =
        newHead.x === s.fruit.pos.x && newHead.y === s.fruit.pos.y;

      // Move snake
      s.snake.unshift(newHead);
      if (!ateFreuit) {
        s.snake.pop();
      } else {
        s.fruitsEaten += 1;
        s.score += 10 * s.level;

        const prevLevel = s.level;
        if (s.fruitsEaten % FRUITS_PER_LEVEL === 0) {
          s.level += 1;
          reschedule();
        }

        s.fruit = randomFruit(s.snake);

        // Fire callbacks only when values change
        if (s.score !== prevScoreRef.current) {
          prevScoreRef.current = s.score;
          onScoreChange(s.score);
        }
        if (s.level !== prevLevel) {
          prevLevelRef.current = s.level;
          onLevelChange(s.level);
        }
      }
    }

    function triggerDeath() {
      if (deadFiredRef.current) return;
      deadFiredRef.current = true;
      stateRef.current.dead = true;
      clearInterval(intervalRef.current!);
      draw();
      onLivesChange(0);
      onGameOver(stateRef.current.score);
    }

    // ── Loop ────────────────────────────────────────────────────────────────
    function tick() {
      if (!pausedRef.current) update();
      draw();
    }

    function startLoop() {
      clearInterval(intervalRef.current!);
      intervalRef.current = setInterval(
        tick,
        intervalMs(stateRef.current.level),
      );
    }

    function reschedule() {
      clearInterval(intervalRef.current!);
      intervalRef.current = setInterval(
        tick,
        intervalMs(stateRef.current.level),
      );
    }

    // ── Direction ───────────────────────────────────────────────────────────
    // Shared by the keyboard handler and the touch `GameInput` handle below.
    function setDirection(dx: number, dy: number) {
      const s = stateRef.current;
      const cur = s.dir;
      // Ignore 180° reversal
      if (dx === -cur.x && dy === -cur.y) return;
      s.nextDir = { x: dx, y: dy };
    }

    function handleKey(e: KeyboardEvent) {
      const map: Record<string, Point> = {
        arrowup: { x: 0, y: -1 },
        w: { x: 0, y: -1 },
        arrowdown: { x: 0, y: 1 },
        s: { x: 0, y: 1 },
        arrowleft: { x: -1, y: 0 },
        a: { x: -1, y: 0 },
        arrowright: { x: 1, y: 0 },
        d: { x: 1, y: 0 },
      };
      const next = map[e.key.toLowerCase()];
      if (!next) return;
      e.preventDefault();
      setDirection(next.x, next.y);
    }

    document.addEventListener('keydown', handleKey);

    // Touch action -> direction vector. Every Snake action is a discrete tap,
    // so `release` is a no-op — the direction is already committed on press.
    const ACTION_DIRS: Partial<Record<GameAction, Point>> = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    };

    if (inputRef) {
      inputRef.current = {
        press(action: GameAction) {
          const dir = ACTION_DIRS[action];
          if (dir) setDirection(dir.x, dir.y);
        },
        release() {},
      };
    }

    return () => {
      alive = false;
      redrawRef.current = null;
      clearInterval(intervalRef.current!);
      document.removeEventListener('keydown', handleKey);
      if (inputRef) inputRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
      }}
    >
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ display: 'block', maxWidth: '100%', maxHeight: '100%' }}
      />
    </div>
  );
}
