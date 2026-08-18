'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { hexToRgba } from '@/lib/skins';
import type { GameAction, GameInput } from '@/lib/gameInput';

interface AsteroidsGameProps {
  paused: boolean;
  skinKey?: string;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  /** Imperative handle for the touch controls; the keyboard path keeps working without it. */
  inputRef?: RefObject<GameInput | null>;
}

/**
 * A skin is palette *and* drawing technique: `glow` drives `shadowBlur`, the
 * `*FillAlpha` fields turn the pure wireframes into filled neon silhouettes.
 * Everything the canvas paints — including its own HUD — comes from here; no
 * color literal is left in the draw code.
 */
type Skin = {
  name: string;
  /** Canvas background. Never lighter than the site's `--bg: #0a0a0f`. */
  bg: string;
  ship: string;
  shipFillAlpha: number;
  thrust: string;
  thrustAlpha: number;
  bullet: string;
  asteroid: string;
  asteroidFillAlpha: number;
  particle: string;
  hudScore: string;
  hudLevel: string;
  lifeIcon: string;
  /** Stroke width for ship + asteroid wireframes. */
  lineWidth: number;
  hudFont: string;
  /** `shadowBlur` in px; 0 disables the glow entirely. */
  glow: number;
};

const SKINS: Record<string, Skin> = {
  // Literal freeze of the original palette: white vectors on pure black with an
  // orange thruster. If anything looks different here, it is a bug.
  clasico: {
    name: 'Clásico',
    bg: '#000000',
    ship: '#ffffff',
    shipFillAlpha: 0,
    thrust: '#ff8200',
    thrustAlpha: 0.85,
    bullet: '#ffffff',
    asteroid: '#ffffff',
    asteroidFillAlpha: 0,
    particle: '#ffffff',
    hudScore: '#ffffff',
    hudLevel: '#ffffff',
    lifeIcon: '#ffffff',
    lineWidth: 1.5,
    hudFont: '15px monospace',
    glow: 0,
  },
  // Amber phosphor tube: short warm gamut, hard edges, no glow. The ship is the
  // brightest thing on screen and the rocks sit two luminance steps below it.
  retro: {
    name: 'Retro',
    bg: '#070604',
    ship: '#ffd27f',
    shipFillAlpha: 0,
    thrust: '#ff7a1a',
    thrustAlpha: 0.9,
    bullet: '#fff8e2',
    asteroid: '#9c8550',
    asteroidFillAlpha: 0,
    particle: '#7a6640',
    hudScore: '#e8b455',
    hudLevel: '#7fd06a',
    lifeIcon: '#ffd27f',
    lineWidth: 2,
    hudFont: 'bold 15px monospace',
    glow: 0,
  },
  // Arcade Vault identity: the four house tokens, one per entity, so hues stay
  // maximally apart. Glow is decoration — every base color passes the rubric
  // with `shadowBlur` off.
  neon: {
    name: 'Neon',
    bg: '#05050a',
    ship: '#00f5ff',
    shipFillAlpha: 0.18,
    thrust: '#00ff88',
    thrustAlpha: 0.9,
    bullet: '#f5ff00',
    asteroid: '#ff006e',
    asteroidFillAlpha: 0.14,
    particle: '#00ff88',
    hudScore: '#00f5ff',
    hudLevel: '#f5ff00',
    lifeIcon: '#00f5ff',
    lineWidth: 1.5,
    hudFont: '15px monospace',
    glow: 12,
  },
};

export default function AsteroidsGame({
  paused,
  skinKey = 'clasico',
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
  inputRef,
}: AsteroidsGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Refs so the game loop always reads the latest prop values without re-running the effect
  const pausedRef = useRef(paused);
  const skinRef = useRef<Skin>(SKINS[skinKey] ?? SKINS.clasico);
  const cbScore = useRef(onScoreChange);
  const cbLives = useRef(onLivesChange);
  const cbLevel = useRef(onLevelChange);
  const cbOver = useRef(onGameOver);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  // Swapping the skin only repoints a ref: the game loop effect never re-runs,
  // so the run, the score and the asteroid field all survive the change.
  useEffect(() => {
    skinRef.current = SKINS[skinKey] ?? SKINS.clasico;
  }, [skinKey]);
  useEffect(() => {
    cbScore.current = onScoreChange;
  }, [onScoreChange]);
  useEffect(() => {
    cbLives.current = onLivesChange;
  }, [onLivesChange]);
  useEffect(() => {
    cbLevel.current = onLevelChange;
  }, [onLevelChange]);
  useEffect(() => {
    cbOver.current = onGameOver;
  }, [onGameOver]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const W = 800;
    const H = 600;

    // Active skin, refreshed once per frame at the top of draw(). Every draw
    // method below shares this closure just like it shares `ctx`.
    let skin: Skin = skinRef.current;

    // ── Input ────────────────────────────────────────────────────────────────
    const keys: Record<string, boolean> = {};
    const justPressed: Record<string, boolean> = {};

    // Shared by the keyboard handlers and the touch `GameInput` handle below,
    // so both paths flip exactly the same key state.
    function applyKey(code: string, down: boolean) {
      if (down) {
        justPressed[code] = !keys[code];
        keys[code] = true;
      } else {
        keys[code] = false;
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      applyKey(e.code, true);
      if (
        ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(
          e.code,
        )
      )
        e.preventDefault();
    }
    function onKeyUp(e: KeyboardEvent) {
      applyKey(e.code, false);
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Touch action -> keyboard code it stands in for. `fire` is a `tap`:
    // TouchControls calls press()+release() back to back, which reproduces a
    // keydown/keyup pair and lets `pressed('Space')` below fire exactly once.
    const ACTION_CODES: Partial<Record<GameAction, string>> = {
      left: 'ArrowLeft',
      right: 'ArrowRight',
      up: 'ArrowUp',
      fire: 'Space',
    };

    if (inputRef) {
      inputRef.current = {
        press(action: GameAction) {
          const code = ACTION_CODES[action];
          if (code) applyKey(code, true);
        },
        release(action: GameAction) {
          const code = ACTION_CODES[action];
          if (code) applyKey(code, false);
        },
      };
    }

    function pressed(code: string) {
      const val = justPressed[code];
      justPressed[code] = false;
      return val;
    }

    // ── Utils ────────────────────────────────────────────────────────────────
    const wrap = (v: number, max: number) => ((v % max) + max) % max;
    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.hypot(a.x - b.x, a.y - b.y);
    const rand = (min: number, max: number) =>
      min + Math.random() * (max - min);
    const randInt = (min: number, max: number) =>
      Math.floor(rand(min, max + 1));

    // ── Bullet ───────────────────────────────────────────────────────────────
    class Bullet {
      x: number;
      y: number;
      vx: number;
      vy: number;
      ttl: number;
      radius: number;
      dead: boolean;
      constructor(x: number, y: number, angle: number) {
        this.x = x;
        this.y = y;
        const SPEED = 520;
        this.vx = Math.cos(angle) * SPEED;
        this.vy = Math.sin(angle) * SPEED;
        this.ttl = 1.1;
        this.radius = 2;
        this.dead = false;
      }
      update(dt: number) {
        this.x = wrap(this.x + this.vx * dt, W);
        this.y = wrap(this.y + this.vy * dt, H);
        this.ttl -= dt;
        if (this.ttl <= 0) this.dead = true;
      }
      draw() {
        ctx.save();
        ctx.fillStyle = skin.bullet;
        if (skin.glow) {
          ctx.shadowBlur = skin.glow;
          ctx.shadowColor = skin.bullet;
        }
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // ── Asteroid ─────────────────────────────────────────────────────────────
    const RADII = [0, 16, 30, 50];
    const SPEEDS = [0, 85, 55, 32];
    const POINTS = [0, 100, 50, 20];

    class Asteroid {
      x: number;
      y: number;
      size: number;
      radius: number;
      dead: boolean;
      vx: number;
      vy: number;
      rotSpeed: number;
      rot: number;
      verts: [number, number][];
      constructor(x: number, y: number, size = 3) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.radius = RADII[size];
        this.dead = false;
        const angle = rand(0, Math.PI * 2);
        const speed = SPEEDS[size] + rand(-15, 15);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.rotSpeed = rand(-1.2, 1.2);
        this.rot = rand(0, Math.PI * 2);
        const n = randInt(8, 13);
        this.verts = [];
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const r = this.radius * rand(0.6, 1.0);
          this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
        }
      }
      update(dt: number) {
        this.x = wrap(this.x + this.vx * dt, W);
        this.y = wrap(this.y + this.vy * dt, H);
        this.rot += this.rotSpeed * dt;
      }
      split(): Asteroid[] {
        if (this.size <= 1) return [];
        return [
          new Asteroid(this.x, this.y, this.size - 1),
          new Asteroid(this.x, this.y, this.size - 1),
        ];
      }
      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        ctx.strokeStyle = skin.asteroid;
        ctx.lineWidth = skin.lineWidth;
        ctx.lineJoin = 'round';
        if (skin.glow) {
          ctx.shadowBlur = skin.glow;
          ctx.shadowColor = skin.asteroid;
        }
        ctx.beginPath();
        ctx.moveTo(this.verts[0][0], this.verts[0][1]);
        for (let i = 1; i < this.verts.length; i++)
          ctx.lineTo(this.verts[i][0], this.verts[i][1]);
        ctx.closePath();
        if (skin.asteroidFillAlpha > 0) {
          ctx.fillStyle = hexToRgba(skin.asteroid, skin.asteroidFillAlpha);
          ctx.fill();
        }
        ctx.stroke();
        ctx.restore();
      }
    }

    // ── Ship ─────────────────────────────────────────────────────────────────
    class Ship {
      x!: number;
      y!: number;
      angle!: number;
      vx!: number;
      vy!: number;
      radius!: number;
      thrusting!: boolean;
      invincible!: number;
      shootCooldown!: number;
      dead!: boolean;
      constructor() {
        this.reset();
      }
      reset() {
        this.x = W / 2;
        this.y = H / 2;
        this.angle = -Math.PI / 2;
        this.vx = 0;
        this.vy = 0;
        this.radius = 12;
        this.thrusting = false;
        this.invincible = 3;
        this.shootCooldown = 0;
        this.dead = false;
      }
      update(dt: number) {
        if (this.dead) return;
        if (this.invincible > 0) this.invincible -= dt;
        if (this.shootCooldown > 0) this.shootCooldown -= dt;
        const ROT = 3.5,
          THRUST = 260,
          DRAG = 0.987;
        if (keys['ArrowLeft']) this.angle -= ROT * dt;
        if (keys['ArrowRight']) this.angle += ROT * dt;
        this.thrusting = !!keys['ArrowUp'];
        if (this.thrusting) {
          this.vx += Math.cos(this.angle) * THRUST * dt;
          this.vy += Math.sin(this.angle) * THRUST * dt;
        }
        this.vx *= DRAG;
        this.vy *= DRAG;
        this.x = wrap(this.x + this.vx * dt, W);
        this.y = wrap(this.y + this.vy * dt, H);
      }
      tryShoot(): Bullet[] {
        if (this.shootCooldown > 0 || this.dead) return [];
        this.shootCooldown = 0.2;
        const NOSE = 21;
        const ox = this.x + Math.cos(this.angle) * NOSE;
        const oy = this.y + Math.sin(this.angle) * NOSE;
        return [new Bullet(ox, oy, this.angle)];
      }
      draw() {
        if (this.dead) return;
        if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0)
          return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.strokeStyle = skin.ship;
        ctx.lineWidth = skin.lineWidth;
        ctx.lineJoin = 'round';
        if (skin.glow) {
          ctx.shadowBlur = skin.glow;
          ctx.shadowColor = skin.ship;
        }
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(-12, -9);
        ctx.lineTo(-7, 0);
        ctx.lineTo(-12, 9);
        ctx.closePath();
        if (skin.shipFillAlpha > 0) {
          ctx.fillStyle = hexToRgba(skin.ship, skin.shipFillAlpha);
          ctx.fill();
        }
        ctx.stroke();
        if (this.thrusting && Math.random() > 0.35) {
          ctx.beginPath();
          ctx.moveTo(-8, -4);
          ctx.lineTo(-8 - rand(6, 14), 0);
          ctx.lineTo(-8, 4);
          ctx.strokeStyle = hexToRgba(skin.thrust, skin.thrustAlpha);
          if (skin.glow) ctx.shadowColor = skin.thrust;
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // ── Particle ─────────────────────────────────────────────────────────────
    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      ttl: number;
      dead: boolean;
      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        const angle = rand(0, Math.PI * 2);
        const speed = rand(30, 130);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = rand(0.4, 1.1);
        this.ttl = this.life;
        this.dead = false;
      }
      update(dt: number) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.ttl -= dt;
        if (this.ttl <= 0) this.dead = true;
      }
      draw() {
        const alpha = this.ttl / this.life;
        ctx.strokeStyle = hexToRgba(skin.particle, Number(alpha.toFixed(2)));
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
        ctx.stroke();
      }
    }

    // ── Game state ───────────────────────────────────────────────────────────
    let ship: Ship,
      bullets: Bullet[],
      asteroids: Asteroid[],
      particles: Particle[];
    let score: number, lives: number, level: number;
    let state: 'playing' | 'dead' | 'gameover';
    let deadTimer: number;
    let gameOverFired = false;

    // Previous values to avoid spamming callbacks
    let prevScore = -1,
      prevLives = -1,
      prevLevel = -1;

    function spawnAsteroids(count: number) {
      const SAFE_DIST = 130;
      for (let i = 0; i < count; i++) {
        let x: number, y: number;
        do {
          x = rand(0, W);
          y = rand(0, H);
        } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
        asteroids.push(new Asteroid(x, y, 3));
      }
    }

    function initGame() {
      ship = new Ship();
      bullets = [];
      asteroids = [];
      particles = [];
      score = 0;
      lives = 3;
      level = 1;
      state = 'playing';
      gameOverFired = false;
      prevScore = -1;
      prevLives = -1;
      prevLevel = -1;
      spawnAsteroids(4);
    }

    function nextLevel() {
      level++;
      bullets = [];
      particles = [];
      ship.reset();
      spawnAsteroids(3 + level);
    }

    function explode(x: number, y: number, count = 8) {
      for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
    }

    function killShip() {
      explode(ship.x, ship.y, 14);
      ship.dead = true;
      lives--;
      if (lives <= 0) {
        state = 'gameover';
      } else {
        state = 'dead';
        deadTimer = 2;
      }
    }

    // ── Update ───────────────────────────────────────────────────────────────
    function update(dt: number) {
      if (state === 'gameover') {
        particles.forEach((p) => p.update(dt));
        particles = particles.filter((p) => !p.dead);
        return;
      }

      if (state === 'dead') {
        deadTimer -= dt;
        particles.forEach((p) => p.update(dt));
        particles = particles.filter((p) => !p.dead);
        asteroids.forEach((a) => a.update(dt));
        if (deadTimer <= 0) {
          state = 'playing';
          ship.reset();
        }
        return;
      }

      if (pressed('Space')) bullets.push(...ship.tryShoot());

      ship.update(dt);
      bullets.forEach((b) => b.update(dt));
      asteroids.forEach((a) => a.update(dt));
      particles.forEach((p) => p.update(dt));

      bullets = bullets.filter((b) => !b.dead);
      particles = particles.filter((p) => !p.dead);

      const newAsteroids: Asteroid[] = [];
      for (const b of bullets) {
        for (const a of asteroids) {
          if (!a.dead && !b.dead && dist(b, a) < a.radius) {
            b.dead = true;
            a.dead = true;
            score += POINTS[a.size];
            explode(a.x, a.y, a.size * 5);
            newAsteroids.push(...a.split());
          }
        }
      }
      asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
      bullets = bullets.filter((b) => !b.dead);

      if (ship.invincible <= 0) {
        for (const a of asteroids) {
          if (dist(ship, a) < ship.radius + a.radius * 0.82) {
            killShip();
            break;
          }
        }
      }

      if (asteroids.length === 0) nextLevel();
    }

    // ── Draw ─────────────────────────────────────────────────────────────────
    function drawLifeIcon(x: number, y: number) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-Math.PI / 2);
      ctx.strokeStyle = skin.lifeIcon;
      ctx.lineWidth = 1.2;
      if (skin.glow) {
        ctx.shadowBlur = skin.glow * 0.5;
        ctx.shadowColor = skin.lifeIcon;
      }
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(-6, -5);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-6, 5);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    function drawHUD() {
      ctx.save();
      ctx.font = skin.hudFont;
      if (skin.glow) ctx.shadowBlur = skin.glow * 0.6;
      ctx.fillStyle = skin.hudScore;
      ctx.shadowColor = skin.hudScore;
      ctx.textAlign = 'left';
      ctx.fillText(`SCORE  ${score}`, 14, 26);
      ctx.fillStyle = skin.hudLevel;
      ctx.shadowColor = skin.hudLevel;
      ctx.textAlign = 'center';
      ctx.fillText(`NIVEL ${level}`, W / 2, 26);
      ctx.restore();
      for (let i = 0; i < lives; i++) drawLifeIcon(W - 16 - i * 22, 18);
    }

    function draw() {
      // One read per frame: picks up a skin change on the very next frame
      // without touching game state.
      skin = skinRef.current;
      ctx.fillStyle = skin.bg;
      ctx.fillRect(0, 0, W, H);
      particles.forEach((p) => p.draw());
      asteroids.forEach((a) => a.draw());
      bullets.forEach((b) => b.draw());
      ship.draw();
      drawHUD();
      // GAME OVER overlay removed — React modal handles it
    }

    // ── Loop ─────────────────────────────────────────────────────────────────
    let rafId: number;
    let lastTime: number | null = null;

    function loop(ts: number) {
      const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;

      if (!pausedRef.current) update(dt);
      draw();

      // Notify React of state changes
      if (score !== prevScore) {
        cbScore.current(score);
        prevScore = score;
      }
      if (lives !== prevLives) {
        cbLives.current(lives);
        prevLives = lives;
      }
      if (level !== prevLevel) {
        cbLevel.current(level);
        prevLevel = level;
      }
      if (state === 'gameover' && !gameOverFired) {
        gameOverFired = true;
        cbOver.current(score);
      }

      rafId = requestAnimationFrame(loop);
    }

    initGame();
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (inputRef) inputRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: 'contain',
      }}
    />
  );
}
