'use client';

import { useCallback, useEffect, useRef, type RefObject } from 'react';
import {
  REPEAT_DELAY,
  REPEAT_RATE,
  type GameAction,
  type GameInput,
  type TouchButton,
  type TouchLayout,
} from '@/lib/gameInput';

/** Spoken name per action, for screen readers: the visible label is a glyph. */
const ACTION_LABELS: Record<GameAction, string> = {
  left: 'Izquierda',
  right: 'Derecha',
  up: 'Arriba',
  down: 'Abajo',
  fire: 'Disparar',
  rotate: 'Girar',
  drop: 'Caída',
};

/** One pointer currently sitting on one button. */
interface HeldPointer {
  button: TouchButton;
  /** Timer until the first repetition, for `repeat` buttons. */
  delayId?: number;
  /** Timer between repetitions, for `repeat` buttons. */
  intervalId?: number;
}

interface TouchControlsProps {
  layout: TouchLayout;
  inputRef: RefObject<GameInput | null>;
  /** While `true` the pad is inert and every held action is released. */
  disabled?: boolean;
}

/**
 * On-screen game pad. Lives in the DOM next to the canvas, never inside it, and
 * talks to the game only through the `GameInput` handle it publishes in
 * `inputRef` — the same primitive the keyboard handler drives.
 */
export default function TouchControls({
  layout,
  inputRef,
  disabled = false,
}: TouchControlsProps) {
  const held = useRef(new Map<number, HeldPointer>());

  const fire = useCallback(
    (action: GameAction) => {
      const input = inputRef.current;
      if (!input) return;
      input.press(action);
      input.release(action);
    },
    [inputRef],
  );

  const stopTimers = useCallback((entry: HeldPointer) => {
    if (entry.delayId !== undefined) window.clearTimeout(entry.delayId);
    if (entry.intervalId !== undefined) window.clearInterval(entry.intervalId);
    entry.delayId = undefined;
    entry.intervalId = undefined;
  }, []);

  const endPress = useCallback(
    (pointerId: number) => {
      const entry = held.current.get(pointerId);
      if (!entry) return;
      held.current.delete(pointerId);
      stopTimers(entry);
      if (entry.button.mode === 'hold') {
        inputRef.current?.release(entry.button.action);
      }
    },
    [inputRef, stopTimers],
  );

  /** Lets go of everything: pause, unmount, or a run that ended mid-press. */
  const releaseAll = useCallback(() => {
    for (const pointerId of Array.from(held.current.keys())) {
      endPress(pointerId);
    }
  }, [endPress]);

  const startPress = useCallback(
    (button: TouchButton, pointerId: number) => {
      const entry: HeldPointer = { button };
      held.current.set(pointerId, entry);

      switch (button.mode) {
        case 'hold':
          inputRef.current?.press(button.action);
          break;
        case 'tap':
          fire(button.action);
          break;
        case 'repeat':
          fire(button.action);
          entry.delayId = window.setTimeout(() => {
            entry.delayId = undefined;
            entry.intervalId = window.setInterval(
              () => fire(button.action),
              REPEAT_RATE,
            );
          }, REPEAT_DELAY);
          break;
      }
    },
    [fire, inputRef],
  );

  useEffect(() => {
    if (disabled) releaseAll();
  }, [disabled, releaseAll]);

  useEffect(() => releaseAll, [releaseAll]);

  const renderButton = (button: TouchButton) => (
    <button
      key={button.action}
      type="button"
      className="touch-btn"
      disabled={disabled}
      aria-label={ACTION_LABELS[button.action]}
      data-action={button.action}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        startPress(button, e.pointerId);
      }}
      onPointerUp={(e) => endPress(e.pointerId)}
      onPointerCancel={(e) => endPress(e.pointerId)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {button.label}
    </button>
  );

  return (
    <div className="touch-controls" role="group" aria-label="Controles táctiles">
      <div className="touch-dpad">{layout.dpad.map(renderButton)}</div>
      {layout.actions.length > 0 && (
        <div className="touch-actions">{layout.actions.map(renderButton)}</div>
      )}
    </div>
  );
}
