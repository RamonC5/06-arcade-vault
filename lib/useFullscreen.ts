'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

export interface UseFullscreenResult {
  /** Attach to the element that should fill the screen — the `.av-stage` wrapper. */
  ref: RefObject<HTMLDivElement | null>;
  active: boolean;
  toggle: () => void;
}

/**
 * Fullscreen for a single element, with a CSS fallback (`.av-stage-fs`) for
 * browsers that don't implement `requestFullscreen` outside `<video>` —
 * Safari on iPhone chief among them. `active` is the single source of truth
 * for the button and the wrapper class in both paths.
 *
 * The native path is driven by the `fullscreenchange` event rather than by
 * `toggle()` itself, so `active` stays correct no matter how fullscreen ends:
 * the button, the `Escape` key, or the browser's own UI.
 */
export function useFullscreen(): UseFullscreenResult {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  // Mirrors `active` so `toggle` can read the latest value with a stable
  // identity — callers rely on that stability to avoid re-running effects
  // that list `toggle` in their dependencies.
  const activeRef = useRef(false);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    function onFullscreenChange() {
      setActive(document.fullscreenElement === ref.current);
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggle = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    if (activeRef.current) {
      // Native session: let `fullscreenchange` flip `active` once the exit
      // completes. CSS fallback: nothing native to exit, flip it directly.
      if (document.fullscreenElement === el) {
        document.exitFullscreen();
      } else {
        setActive(false);
      }
      return;
    }

    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => setActive(true));
    } else {
      setActive(true);
    }
  }, []);

  return { ref, active, toggle };
}
