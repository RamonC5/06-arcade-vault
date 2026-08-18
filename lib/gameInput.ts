'use client';

/**
 * Shared plumbing for the touch controls.
 *
 * The games keep listening to the keyboard exactly as before; this module only
 * adds a second, explicit way in. A game publishes a `GameInput` handle through
 * its `inputRef` prop and `TouchControls` drives it, so the on-screen pad lives
 * outside the canvas and never interferes with the skins or the in-canvas HUD.
 */

import { useEffect, useState } from 'react';

/** Every input a game can receive. Not every game uses every action. */
export type GameAction =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'fire'
  | 'rotate'
  | 'drop';

/**
 * Imperative handle a game exposes through `inputRef`. `release` is a no-op for
 * games whose actions are all discrete (Tetris, Snake).
 */
export interface GameInput {
  press(action: GameAction): void;
  release(action: GameAction): void;
}

/**
 * How a button behaves while it is held:
 * - `hold`   — `press` on pointer down, `release` on pointer up.
 * - `tap`    — `press` + `release` on pointer down, nothing afterwards.
 * - `repeat` — like `tap`, then again every `REPEAT_RATE` ms after `REPEAT_DELAY` ms.
 */
export type TouchMode = 'hold' | 'tap' | 'repeat';

export interface TouchButton {
  action: GameAction;
  /** Glyph or short text. UI copy is Spanish. */
  label: string;
  mode: TouchMode;
}

export interface TouchLayout {
  /** Left block: directions. */
  dpad: TouchButton[];
  /** Right block: actions. May be empty. */
  actions: TouchButton[];
}

/** ms until the first repetition of a `repeat` button. */
export const REPEAT_DELAY = 250;
/** ms between successive repetitions. */
export const REPEAT_RATE = 120;

/**
 * `true` when the primary pointer is coarse (a finger). Returns `false` on the
 * first render and the real value after mounting — same rule as `getSavedSkin`
 * in `lib/skins.ts` — so the first client render matches the server HTML.
 */
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(pointer: coarse)');
    const sync = () => setCoarse(mql.matches);
    sync();
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, []);

  return coarse;
}
