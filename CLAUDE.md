# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — an online gaming platform where users play canvas arcade games and compete on leaderboards. Built with **Spec Driven Design**: every feature starts as a spec in `specs/`, then gets implemented from it.

UI copy and specs are written in **Spanish**. Code, identifiers and comments are in English.

## Stack

- **Next.js 16.2.6** with App Router (`app/` directory) — read `node_modules/next/dist/docs/` before writing Next.js code; APIs differ from training data
- **React 19.2.4**
- **Tailwind CSS v4** (PostCSS plugin via `@tailwindcss/postcss`) — imported, but most styling lives in hand-written classes in `app/globals.css`
- **TypeScript**
- **Supabase** (`@supabase/ssr` + `@supabase/supabase-js`) — games catalog, scores/leaderboards
- **Resend** — contact form email delivery
- **Prettier + ESLint** — enforced automatically by a hook (see below)

Scripts: `npm run dev` · `build` · `lint` · `format` · `format:check`. No test runner is configured yet.

Required env vars (see `.env.template`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `RESEND_API_KEY`.

## Skills & workflow

Specs live in `specs/NN-slug.md`, numbered sequentially, each with a header stating `Estado` (`Borrador` → `Aprobado` → `Implementado`), `Depende de` and `Objetivo`. Never renumber existing specs; a new spec takes `max(NN) + 1`.

- **`/spec`** — guided spec designer (asks questions, builds the spec section by section, writes nothing but the `.md`). Installed from `Klerith/fernando-skills`, lives in `.agents/skills/spec/` (with `template.md`), tracked in `skills-lock.json`.
- **`/spec-impl NN`** — implements an approved spec: validates the state is "Approved", creates and checks out a branch named after the spec, then works step by step. Lives in `.agents/skills/spec-impl/`.
- **`/add-game`** — project-local skill (`.claude/skills/add-game/`) that generates the spec for a new canvas game: React component, play page, `games` row INSERT and leaderboard wiring. Accepts a folder under `references/started-games/` or a free-form description. It **never writes code** — only `specs/NN-<slug>-game.md`, to be executed later with `/spec-impl`.
- **`/frontend-design`** — usa siempre este skill para diseñar la interfaz de usuario.

### Agents

- **`game-planner`** (`.claude/agents/game-planner.md`) — decides **which game to build next**. Diagnoses the catalog (category balance, free `.cover-*` classes, mechanics already covered), then returns 3 ranked candidates with an argued #1. Keeps a persistent ledger of everything ever proposed in `references/game-suggestions-todo.md` so it never repeats an idea across sessions. Reads only repo files — no MCP, no web. It **never writes code or specs**; the ledger is the only file it touches.
- **`game-jam`** (`.claude/agents/game-jam.md`) — a parallel, exploratory flow: given a **theme or game idea supplied directly by the user** (not "what's next"), it generates **two complete, ready-to-review specs** with mechanically distinct games that both fit the request, in `specs/game-jam/NN-<theme-slug>/` (`01-<id>-game.md`, `02-<id>-game.md`, plus a `README.md` comparing the two). Both specs start in `Borrador`. It deliberately does **not** read `game-suggestions-todo.md` or `implemented-games.md` and does no duplicate/collision checking — the user owns that judgment. It **never writes code**; a chosen variant must be copied/renumbered into flat `specs/` before `/spec-impl` can run on it (that skill doesn't recurse into subfolders).

- **`skin-designer`** (`.claude/agents/skin-designer.md`) — works on **one already-implemented game per run, the one the user names**, and leaves it with at least three canvas skins: `clasico` (default, a literal freeze of how the game looks today), `retro` and `neon`. Validates every skin numerically against a dark-legibility rubric (WCAG contrast over `--bg #0a0a0f`, no light backgrounds, in-canvas HUD counts as part of the skin) — the site has no light mode and never will. Unlike the other two agents it **does write code**: the game component, its play page, and the shared `lib/skins.ts` / `components/SkinPicker.tsx`. It never touches another game, `app/globals.css`, `specs/`, Supabase or gameplay. Keeps its ledger in `references/games-with-themes.md`. Invoked with no game name, it just prints the ledger and stops.

The full cycle for adding a game:

```
game-planner   →   /add-game   →   /spec-impl NN
 (which game)      (the spec)      (the code)
```

`skin-designer` is **orthogonal** to that cycle: it runs on games that already shipped, one at a time, and never adds one.

### Automation

- **Hook** — `.claude/settings.json` registers a `PostToolUse` hook on `Write|Edit|MultiEdit` that runs `.claude/hooks/format-and-lint.sh`: strips trailing whitespace, runs `prettier --write`, then `eslint --fix` on JS/TS files. Don't hand-format edited files; the hook does it.
- **MCP** — `.mcp.json` wires the hosted **Supabase MCP server** (project `vqancunfssslvizqhywi`) with docs, database, debugging, development, functions and branching features. Use it to inspect tables or run SQL instead of guessing schema.

## Architecture

App Router exclusively — no `pages/` directory. Server Components are the default; mark client components with `"use client"` only when needed.

### Routes

| Route | File | Notes |
| --- | --- | --- |
| `/` | `app/page.tsx` | Landing page (hero, features, preview, pricing, CTA) |
| `/games` | `app/games/page.tsx` | Server component; fetches `games` from  (see references\implemented-games.md), renders `GamesGrid` (client filter by category) |
| `/games/[id]` | `app/games/[id]/page.tsx` | Detail page + top-10 leaderboard from `scores` |
| `/games/[id]/play` | `app/games/[id]/play/page.tsx` | **Simulated** fallback player for games without a real implementation (random score ticker) |
| `/games/<slug>/play` | `app/games/<slug>/play/page.tsx` | Real player, one per implemented game |
| `/hall-of-fame` | `app/hall-of-fame/page.tsx` | Server shell + `HallOfFameClient` with a tab per game |
| `/about` | `app/about/page.tsx` | About + contact form |
| `/auth` | `app/auth/page.tsx` | Sign in / sign up screen |
| `POST /api/contact` | `app/api/contact/route.ts` | Sends the contact email via Resend |

Supporting files: `app/layout.tsx` (root layout with `UserProvider`, `Nav`, background layers and footer), `app/context/UserContext.tsx`, `app/RevealObserver.tsx` (IntersectionObserver scroll reveals). `app/data/*.ts` are **empty leftovers** from spec 01 — all game and score data now comes from Supabase; don't import from there.

### Data layer

`lib/supabase/` holds `client.ts` (browser, `createBrowserClient`), `server.ts` (async `createClient` using `cookies()`), and `types.ts` exporting `GameRow` and `ScoreRow`.

- **`games`** — `id` (slug PK), `title`, `short`, `long`, `cat` (`ARCADE` | `PUZZLE` | `SHOOTER`), `cover` (CSS class), `color` (`cyan` | `magenta` | `yellow` | `green`), `created_at`
- **`scores`** — `id`, `game_id`, `player_name`, `score`, `user_id`, `created_at`

Adding a game means inserting a row in `games`; `/games`, `/games/[id]` and `/hall-of-fame` pick it up automatically.

### Games

Implemented canvas games (component in `components/games/`, play route under `app/games/<id>/play/`): **asteroids**, **tetris**, **arkanoid**, **snake**.

Every game component follows the same contract:

```ts
interface GameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}
```

Conventions to preserve when adding one:

- The component owns a fixed-size `<canvas width={W} height={H}>` stretched with `width/height: 100%`; the game loop lives in a `useEffect` and must remove its keyboard listeners on cleanup.
- The play page imports it with `next/dynamic` and `ssr: false`, holds the React HUD state, and restarts by bumping a `gameKey` passed as `key`.
- The canvas keeps its internal HUD but must not draw its own GAME OVER overlay — the React modal replaces it.
- On save, the page inserts into `scores` from the browser client and persists the player name in `localStorage` under `av_player_name`.
- Skins: the component takes `skinKey?: string` defaulting to `'clasico'` and offers at least `clasico` / `retro` / `neon`, applied through a `skinRef` so switching skin never restarts the run. `clasico` must be a literal freeze of the game's original colors. See `components/games/TetrisGame.tsx` for the canonical `type Skin` / `SKINS` pattern, and the `skin-designer` agent to add them.

`references/started-games/` holds the original standalone HTML/JS versions used as the source for ports, and `references/source-assets/` the sprite sheets; runtime assets are copied into `public/`. `references/templates/` keeps the original design prototypes.

Three hand-maintained ledgers live in `references/`: `implemented-games.md` (what is built and live in `games`), `game-suggestions-todo.md` (the `game-planner` agent's memory — every game ever proposed, with its state and the reasoning of each round) and `games-with-themes.md` (the `skin-designer` agent's ledger — which games have skins and which ones). Keep `implemented-games.md` in sync when a game ships, and add the new game to `games-with-themes.md` as `Sin skins`.

### Auth

Authentication is **mocked**, not Supabase Auth: `UserContext` stores a display name in `localStorage` under `av_user`, and `/auth` just calls `login()`. `scores.user_id` is always inserted as `null`. Treat any real auth work as a new spec.

### Styling

`app/globals.css` defines the retro-arcade design system: CSS variables (`--bg`, `--ink`, `--cyan`, `--magenta`, `--yellow`, `--green`, `--gold`, `--line`, …), the `--pixel` (Press Start 2P) and `--mono` (JetBrains Mono) font stacks, component classes (`.btn`, `.crt`, `.leaderboard`, `.modal`, `.hud-stat`, `.fade-in`) and one `.cover-*` class per game cover art. Reuse existing classes and tokens rather than introducing ad-hoc Tailwind utilities or hardcoded colors.

Not every `.cover-*` is assigned: `cover-invaders`, `cover-glot`, `cover-rana` and `cover-duelo` are drawn but unused, so a new game that fits one of them needs no new cover art. `game-planner` weighs this when ranking candidates.
