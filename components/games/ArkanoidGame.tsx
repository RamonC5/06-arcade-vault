'use client';

import { useEffect, useRef, type RefObject } from 'react';
import type { GameAction, GameInput } from '@/lib/gameInput';

interface ArkanoidGameProps {
  paused: boolean;
  skinKey?: string;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  /** Imperative handle for the touch controls; the keyboard path keeps working without it. */
  inputRef?: RefObject<GameInput | null>;
}

// ── Skins ─────────────────────────────────────────────────────────────────────

/**
 * Arkanoid draws almost everything from `/spritesheet-breakout.png`, so a skin
 * here is a *recoloring* of that sheet plus a drawing technique. Each tile is
 * re-tinted once into its own offscreen canvas with `source-in`, which keeps the
 * sprite silhouette and replaces every pixel with the skin color — flat, and
 * with an exactly predictable contrast ratio. No new PNG is ever added.
 */
type SpriteTint = {
  /** One color per `BLOCK_SPRITES` key; it also tints that key's explosion. */
  blocks: Record<string, string>;
  ball: string;
  paddle: string;
};

type Skin = {
  /** Registry key. Namespaces the tinted-tile cache. */
  id: string;
  name: string;
  /** Canvas background. Never lighter than the site's `--bg: #0a0a0f`. */
  bg: string;
  /**
   * `null` blits the spritesheet untouched — that is exactly what `clasico`
   * does, which is why it is a pixel-for-pixel freeze of the original look.
   */
  tint: SpriteTint | null;
  /** Pixels shaved off every block edge so a row does not read as a solid bar. */
  blockInset: number;
  /** `globalAlpha` of the block body; the stroke below is always full alpha. */
  blockFillAlpha: number;
  /** Bright outline around each block — the neon-tube look. */
  blockStroke: boolean;
  blockLineWidth: number;
  /** `shadowBlur` in px; 0 disables the glow entirely. */
  glow: number;
  hudScore: string;
  hudLevel: string;
  hudFont: string;
};

const SKINS: Record<string, Skin> = {
  // Literal freeze of the original: untouched spritesheet on pure black with a
  // white HUD. `tint: null` + zero inset + no stroke + no glow means the draw
  // calls are byte-for-byte the ones this game already emitted. If anything
  // looks different here, it is a bug.
  clasico: {
    id: 'clasico',
    name: 'Clásico',
    bg: '#000000',
    tint: null,
    blockInset: 0,
    blockFillAlpha: 1,
    blockStroke: false,
    blockLineWidth: 0,
    glow: 0,
    hudScore: '#ffffff',
    hudLevel: '#ffffff',
    hudFont: 'bold 18px monospace',
  },
  // Amber phosphor tube: short warm gamut, hard flat edges, no glow. The seven
  // block keys are spread along a luminance ladder (magenta dimmest, yellow
  // brightest) with two phosphor-green steps breaking up the amber run, so rows
  // stay apart even though the gamut is deliberately narrow. A 1px inset draws
  // the groove that the flat tint erases.
  retro: {
    id: 'retro',
    name: 'Retro',
    bg: '#070604',
    tint: {
      blocks: {
        gray: '#969084',
        red: '#d9762a',
        yellow: '#f5d070',
        cyan: '#aad46e',
        magenta: '#a86a34',
        hotpink: '#e8a04a',
        green: '#7fb04a',
      },
      ball: '#fffdf2',
      paddle: '#ffc46a',
    },
    blockInset: 1,
    blockFillAlpha: 1,
    blockStroke: false,
    blockLineWidth: 0,
    glow: 0,
    hudScore: '#e8b455',
    hudLevel: '#8fd06a',
    hudFont: 'bold 18px monospace',
  },
  // Arcade Vault identity: the house tokens (`--cyan`, `--magenta`, `--yellow`,
  // `--green`) plus three derived hues so all seven block keys stay far apart on
  // the wheel. Technique is Tetris': translucent body + full-alpha bright stroke
  // + `shadowBlur`. The glow is decoration — every base color passes the rubric
  // with it switched off.
  neon: {
    id: 'neon',
    name: 'Neon',
    bg: '#05050a',
    tint: {
      blocks: {
        gray: '#98a0b0',
        red: '#ff006e',
        yellow: '#f5ff00',
        cyan: '#00f5ff',
        magenta: '#a95cff',
        hotpink: '#ff8a00',
        green: '#00c46a',
      },
      ball: '#ffffff',
      paddle: '#00f5ff',
    },
    blockInset: 2,
    blockFillAlpha: 0.75,
    blockStroke: true,
    blockLineWidth: 1.5,
    glow: 12,
    hudScore: '#00f5ff',
    hudLevel: '#00ff88',
    hudFont: 'bold 18px monospace',
  },
};

// ── Spritesheet data ──────────────────────────────────────────────────────────

const EXPLOSION_FRAMES: Record<
  string,
  { sx: number; sy: number; sw: number; sh: number }[]
> = {
  red: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
  cyan: [
    { sx: 256, sy: 192, sw: 32, sh: 16 },
    { sx: 288, sy: 192, sw: 32, sh: 16 },
    { sx: 320, sy: 192, sw: 32, sh: 16 },
    { sx: 352, sy: 192, sw: 32, sh: 16 },
  ],
  green: [
    { sx: 256, sy: 208, sw: 32, sh: 16 },
    { sx: 288, sy: 208, sw: 32, sh: 16 },
    { sx: 320, sy: 208, sw: 32, sh: 16 },
    { sx: 352, sy: 208, sw: 32, sh: 16 },
  ],
  magenta: [
    { sx: 256, sy: 224, sw: 32, sh: 16 },
    { sx: 288, sy: 224, sw: 32, sh: 16 },
    { sx: 320, sy: 224, sw: 32, sh: 16 },
    { sx: 352, sy: 224, sw: 32, sh: 16 },
  ],
  yellow: [
    { sx: 256, sy: 240, sw: 32, sh: 16 },
    { sx: 288, sy: 240, sw: 32, sh: 16 },
    { sx: 320, sy: 240, sw: 32, sh: 16 },
    { sx: 352, sy: 240, sw: 32, sh: 16 },
  ],
  hotpink: [
    { sx: 256, sy: 256, sw: 32, sh: 16 },
    { sx: 288, sy: 256, sw: 32, sh: 16 },
    { sx: 320, sy: 256, sw: 32, sh: 16 },
    { sx: 352, sy: 256, sw: 32, sh: 16 },
  ],
  gray: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
};

const EXPLOSION_DURATION = 150;

const SPRITES: Record<
  string,
  { sx: number; sy: number; sw: number; sh: number }
> = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
};

const BLOCK_SPRITES: Record<
  string,
  { sx: number; sy: number; sw: number; sh: number }
> = {
  gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
  red: { sx: 32, sy: 176, sw: 32, sh: 16 },
  yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
  cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
  magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
  hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
  green: { sx: 32, sy: 208, sw: 32, sh: 16 },
};

// ── Level data ────────────────────────────────────────────────────────────────

type BlockDef = { col: number; row: number; color: string };
type Level = { speed: number; blocks: BlockDef[] };

const LEVELS: Level[] = (() => {
  const rowColors1 = ['red', 'yellow', 'cyan', 'magenta', 'hotpink', 'green'];
  const rowColors2 = ['gray', 'cyan', 'hotpink', 'yellow', 'magenta', 'green'];
  const rowColors4 = ['cyan', 'magenta', 'green', 'yellow', 'hotpink', 'red'];

  const l1: BlockDef[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      l1.push({ col, row, color: rowColors1[row] });

  const l2: BlockDef[] = [];
  const pyStart = [4, 3, 2, 1, 0, 0];
  const pyEnd = [5, 6, 7, 8, 9, 9];
  for (let row = 0; row < 6; row++)
    for (let col = pyStart[row]; col <= pyEnd[row]; col++)
      l2.push({ col, row, color: rowColors2[row] });

  const l3: BlockDef[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      if ((col + row) % 2 === 0)
        l3.push({ col, row, color: row < 3 ? 'yellow' : 'magenta' });

  const gaps4 = [
    [2, 5, 8],
    [0, 4, 7, 9],
    [1, 3, 6],
    [2, 5, 8, 9],
    [0, 4, 7],
    [1, 3, 6, 9],
  ];
  const l4: BlockDef[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      if (!gaps4[row].includes(col))
        l4.push({ col, row, color: rowColors4[row] });

  const l5: BlockDef[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++) {
      const isFrame = col === 0 || col === 9 || row === 0 || row === 5;
      const isCross = col === 4 || row === 2;
      if (isFrame || isCross)
        l5.push({ col, row, color: isCross && !isFrame ? 'hotpink' : 'cyan' });
    }

  return [
    { speed: 1.0, blocks: l1 },
    { speed: 1.1, blocks: l2 },
    { speed: 1.21, blocks: l3 },
    { speed: 1.33, blocks: l4 },
    { speed: 1.46, blocks: l5 },
  ];
})();

// ── Game constants ─────────────────────────────────────────────────────────────

const W = 800;
const H = 600;
const PADDLE_SPEED = 400;
const BLOCK_COLS = 10;
const BLOCK_W = 64;
const BLOCK_H = 24;
const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2;
const BLOCKS_ORIGIN_Y = 80;
const BASE_BALL_VX = 200;
const BASE_BALL_VY = -300;

// ── Types ──────────────────────────────────────────────────────────────────────

type Block = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  alive: boolean;
};
type Explosion = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  elapsed: number;
};

export default function ArkanoidGame({
  paused,
  skinKey = 'clasico',
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
  inputRef,
}: ArkanoidGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  const skinRef = useRef<Skin>(SKINS[skinKey] ?? SKINS.clasico);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Swapping the skin only repoints a ref. The game-loop effect below never
  // re-runs on a skin change, so the run, the score, the lives and the block
  // layout all survive it.
  useEffect(() => {
    skinRef.current = SKINS[skinKey] ?? SKINS.clasico;
  }, [skinKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    // Active skin, refreshed once per frame at the top of draw(). Every drawing
    // helper below shares this closure just like it shares `ctx`.
    let skin: Skin = skinRef.current;

    // ── Spritesheet ──────────────────────────────────────────────────────────
    let ssImg: HTMLCanvasElement | null = null;
    let ssLoaded = false;

    /**
     * Tinted copies of the sheet tiles, keyed by `skin id + tile`. A tile is
     * recolored once, on first use, and reused every frame after that.
     */
    const tintCache = new Map<string, HTMLCanvasElement>();

    function tintedTile(
      src: HTMLCanvasElement,
      cacheKey: string,
      frame: { sx: number; sy: number; sw: number; sh: number },
      color: string,
    ) {
      const cached = tintCache.get(cacheKey);
      if (cached) return cached;
      const tile = document.createElement('canvas');
      tile.width = frame.sw;
      tile.height = frame.sh;
      const tctx = tile.getContext('2d')!;
      tctx.drawImage(
        src,
        frame.sx,
        frame.sy,
        frame.sw,
        frame.sh,
        0,
        0,
        frame.sw,
        frame.sh,
      );
      // `source-in` keeps the alpha silhouette and repaints every opaque pixel
      // with the skin color.
      tctx.globalCompositeOperation = 'source-in';
      tctx.fillStyle = color;
      tctx.fillRect(0, 0, frame.sw, frame.sh);
      tintCache.set(cacheKey, tile);
      return tile;
    }

    /** Blits a sheet tile, raw when the skin has no tint (that is `clasico`). */
    function blit(
      frame: { sx: number; sy: number; sw: number; sh: number },
      x: number,
      y: number,
      w: number,
      h: number,
      color: string | null,
      cacheKey: string,
    ) {
      if (!ssLoaded || !ssImg) return;
      if (!color) {
        ctx.drawImage(
          ssImg,
          frame.sx,
          frame.sy,
          frame.sw,
          frame.sh,
          x,
          y,
          w,
          h,
        );
        return;
      }
      const tile = tintedTile(ssImg, cacheKey, frame, color);
      ctx.drawImage(tile, 0, 0, frame.sw, frame.sh, x, y, w, h);
    }

    function drawSprite(
      name: 'ball' | 'paddle',
      x: number,
      y: number,
      w: number,
      h: number,
    ) {
      const sp = SPRITES[name];
      if (!sp) return;
      const color = skin.tint ? skin.tint[name] : null;
      if (skin.glow && color) {
        ctx.shadowBlur = skin.glow;
        ctx.shadowColor = color;
      }
      blit(sp, x, y, w, h, color, `${skin.id}|${name}`);
      ctx.shadowBlur = 0;
    }

    function drawBlock(block: Block) {
      const frame = BLOCK_SPRITES[block.color];
      if (!frame) return;
      const inset = skin.blockInset;
      const x = block.x + inset;
      const y = block.y + inset;
      const w = block.w - inset * 2;
      const h = block.h - inset * 2;
      const color = skin.tint ? skin.tint.blocks[block.color] : null;

      if (skin.glow && color) {
        ctx.shadowBlur = skin.glow;
        ctx.shadowColor = color;
      }
      ctx.globalAlpha = skin.blockFillAlpha;
      blit(frame, x, y, w, h, color, `${skin.id}|block|${block.color}`);
      ctx.globalAlpha = 1;
      if (skin.blockStroke && color) {
        const off = skin.blockLineWidth / 2;
        ctx.strokeStyle = color;
        ctx.lineWidth = skin.blockLineWidth;
        ctx.strokeRect(
          x + off,
          y + off,
          w - skin.blockLineWidth,
          h - skin.blockLineWidth,
        );
      }
      ctx.shadowBlur = 0;
    }

    function drawExplosion(exp: Explosion, frameIndex: number) {
      const frames = EXPLOSION_FRAMES[exp.color];
      if (!frames) return;
      const color = skin.tint ? skin.tint.blocks[exp.color] : null;
      if (skin.glow && color) {
        ctx.shadowBlur = skin.glow;
        ctx.shadowColor = color;
      }
      blit(
        frames[frameIndex],
        exp.x,
        exp.y,
        exp.w,
        exp.h,
        color,
        `${skin.id}|boom|${exp.color}|${frameIndex}`,
      );
      ctx.shadowBlur = 0;
    }

    // ── Game state ───────────────────────────────────────────────────────────
    const paddle = { x: 0, y: 560, w: 81, h: 14 };
    const ball = {
      x: 0,
      y: 0,
      w: 16,
      h: 16,
      vx: BASE_BALL_VX,
      vy: BASE_BALL_VY,
    };

    let blocks: Block[] = [];
    let explosions: Explosion[] = [];
    let lives = 3;
    let score = 0;
    let gameState: 'playing' | 'gameover' | 'win' = 'playing';
    let currentLevel = 1;

    // Reported-value trackers so callbacks only fire on change
    let reportedScore = 0;
    let reportedLives = 3;
    let reportedLevel = 1;
    let gameOverFired = false;

    const keys: Record<string, boolean> = {
      ArrowLeft: false,
      ArrowRight: false,
    };

    // ── Audio ────────────────────────────────────────────────────────────────
    const bounceSound = new Audio('/ball-bounce.mp3');
    const breakSound = new Audio('/break-sound.mp3');

    function playBounce() {
      try {
        (bounceSound.cloneNode() as HTMLAudioElement).play().catch(() => {});
      } catch {}
    }
    function playBreak() {
      try {
        (breakSound.cloneNode() as HTMLAudioElement).play().catch(() => {});
      } catch {}
    }

    // ── Init helpers ─────────────────────────────────────────────────────────
    function initPaddle() {
      paddle.x = (W - paddle.w) / 2;
    }

    function initBall() {
      const speed = LEVELS[currentLevel - 1].speed;
      ball.x = paddle.x + (paddle.w - ball.w) / 2;
      ball.y = paddle.y - ball.h;
      ball.vx = BASE_BALL_VX * speed;
      ball.vy = BASE_BALL_VY * speed;
    }

    function loadLevel(n: number) {
      currentLevel = n;
      const level = LEVELS[n - 1];
      blocks = level.blocks.map((b) => ({
        x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
        y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
        w: BLOCK_W,
        h: BLOCK_H,
        color: b.color,
        alive: true,
      }));
      explosions = [];
      ball.x = paddle.x + (paddle.w - ball.w) / 2;
      ball.y = paddle.y - ball.h;
      ball.vx = BASE_BALL_VX * level.speed;
      ball.vy = BASE_BALL_VY * level.speed;
    }

    // ── Collision ────────────────────────────────────────────────────────────
    function collideAABB(block: Block) {
      return (
        ball.x < block.x + block.w &&
        ball.x + ball.w > block.x &&
        ball.y < block.y + block.h &&
        ball.y + ball.h > block.y
      );
    }

    // ── Update ───────────────────────────────────────────────────────────────
    function update(dt: number) {
      if (gameState !== 'playing') return;

      if (keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
      if (keys.ArrowRight)
        paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x <= 0) {
        ball.x = 0;
        ball.vx = Math.abs(ball.vx);
        playBounce();
      }
      if (ball.x + ball.w >= W) {
        ball.x = W - ball.w;
        ball.vx = -Math.abs(ball.vx);
        playBounce();
      }
      if (ball.y <= 0) {
        ball.y = 0;
        ball.vy = Math.abs(ball.vy);
        playBounce();
      }

      if (
        ball.vy > 0 &&
        ball.x + ball.w > paddle.x &&
        ball.x < paddle.x + paddle.w &&
        ball.y + ball.h >= paddle.y &&
        ball.y + ball.h <= paddle.y + paddle.h + 8
      ) {
        ball.y = paddle.y - ball.h;
        ball.vy = -Math.abs(ball.vy);
        playBounce();
      }

      for (const block of blocks) {
        if (!block.alive) continue;
        if (collideAABB(block)) {
          block.alive = false;
          explosions.push({
            x: block.x,
            y: block.y,
            w: block.w,
            h: block.h,
            color: block.color,
            elapsed: 0,
          });
          score += 10;
          ball.vy = -ball.vy;
          playBreak();
          if (blocks.every((b) => !b.alive)) {
            if (currentLevel < 5) loadLevel(currentLevel + 1);
            else gameState = 'win';
          }
          break;
        }
      }

      for (const exp of explosions) exp.elapsed += dt * 1000;
      explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

      if (ball.y > H) {
        lives--;
        if (lives <= 0) {
          lives = 0;
          gameState = 'gameover';
        } else {
          initBall();
        }
      }

      // ── Notify React ───────────────────────────────────────────────────────
      if (score !== reportedScore) {
        reportedScore = score;
        onScoreChange(score);
      }
      if (lives !== reportedLives) {
        reportedLives = lives;
        onLivesChange(lives);
      }
      if (currentLevel !== reportedLevel) {
        reportedLevel = currentLevel;
        onLevelChange(currentLevel);
      }

      if (!gameOverFired && (gameState === 'gameover' || gameState === 'win')) {
        gameOverFired = true;
        onLivesChange(0);
        onGameOver(score);
      }
    }

    // ── Draw ─────────────────────────────────────────────────────────────────
    function draw() {
      // One read per frame: every helper above sees the switch immediately,
      // without the effect ever re-running.
      skin = skinRef.current;

      ctx.fillStyle = skin.bg;
      ctx.fillRect(0, 0, W, H);

      for (const block of blocks) if (block.alive) drawBlock(block);

      for (const exp of explosions) {
        const frameIndex = Math.min(
          Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4),
          3,
        );
        drawExplosion(exp, frameIndex);
      }

      drawSprite('paddle', paddle.x, paddle.y, paddle.w, paddle.h);
      drawSprite('ball', ball.x, ball.y, ball.w, ball.h);

      // Internal HUD (score top-left, level top-center, lives as sprites
      // top-right). Its colors are part of the skin, not loose literals.
      if (skin.glow) {
        ctx.shadowBlur = skin.glow;
        ctx.shadowColor = skin.hudScore;
      }
      ctx.fillStyle = skin.hudScore;
      ctx.font = skin.hudFont;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Score: ' + score, 10, 10);
      ctx.textAlign = 'center';
      if (skin.glow) ctx.shadowColor = skin.hudLevel;
      ctx.fillStyle = skin.hudLevel;
      ctx.fillText('Nivel: ' + currentLevel, W / 2, 10);
      ctx.shadowBlur = 0;
      const ballSize = 16;
      const ballSpacing = 4;
      for (let i = 0; i < lives; i++) {
        const bx = W - 10 - (lives - i) * (ballSize + ballSpacing);
        drawSprite('ball', bx, 10, ballSize, ballSize);
      }
    }

    // ── Loop ─────────────────────────────────────────────────────────────────
    let rafId: number;
    let lastTime: number | null = null;

    function loop(timestamp: number) {
      if (lastTime === null) lastTime = timestamp;
      const dt = (timestamp - lastTime) / 1000;
      lastTime = timestamp;

      if (!pausedRef.current) update(dt);
      draw();

      rafId = requestAnimationFrame(loop);
    }

    // ── Event handlers ────────────────────────────────────────────────────────
    // Shared by the keyboard handlers and the touch `GameInput` handle below.
    function applyKey(key: string, down: boolean) {
      if (key in keys) keys[key] = down;
    }
    function onKeyDown(e: KeyboardEvent) {
      applyKey(e.key, true);
      // P / Escape intentionally NOT handled — platform controls pause
    }
    function onKeyUp(e: KeyboardEvent) {
      applyKey(e.key, false);
    }

    const ACTION_KEYS: Partial<Record<GameAction, string>> = {
      left: 'ArrowLeft',
      right: 'ArrowRight',
    };

    if (inputRef) {
      inputRef.current = {
        press(action: GameAction) {
          const key = ACTION_KEYS[action];
          if (key) applyKey(key, true);
        },
        release(action: GameAction) {
          const key = ACTION_KEYS[action];
          if (key) applyKey(key, false);
        },
      };
    }

    function onMouseMove(e: MouseEvent) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const mouseX = (e.clientX - rect.left) * scaleX;
      paddle.x = Math.max(0, Math.min(W - paddle.w, mouseX - paddle.w / 2));
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousemove', onMouseMove);

    // ── Start ─────────────────────────────────────────────────────────────────
    // Guard against React Strict Mode double-mount: if the effect is cleaned up
    // before the async image load completes, do not start the loop.
    let cleaned = false;

    const rawImg = new Image();
    rawImg.onload = () => {
      if (cleaned) return;
      const oc = document.createElement('canvas');
      oc.width = rawImg.width;
      oc.height = rawImg.height;
      oc.getContext('2d')!.drawImage(rawImg, 0, 0);
      ssImg = oc;
      ssLoaded = true;
      initPaddle();
      loadLevel(1);
      rafId = requestAnimationFrame(loop);
    };
    rawImg.onerror = () => console.error('Failed to load spritesheet');
    rawImg.src = '/spritesheet-breakout.png';

    return () => {
      cleaned = true;
      cancelAnimationFrame(rafId);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousemove', onMouseMove);
      if (inputRef) inputRef.current = null;
    };
  }, [onScoreChange, onLivesChange, onLevelChange, onGameOver, inputRef]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}
