/**
 * Shared plumbing for the canvas skin system.
 *
 * Each game keeps its own `SKINS` registry inside its component: the shapes are
 * genuinely different (blocks, vectors, sprites) and a single `Skin` type would
 * be a premature abstraction. What lives here is only what every game repeats:
 * the option labels, the localStorage persistence and the color math.
 */

/** Display label per skin key. UI copy is Spanish. */
export const SKIN_LABELS: Record<string, string> = {
  clasico: 'Clásico',
  retro: 'Retro',
  neon: 'Neon',
  pastel: 'Pastel',
  pixel: 'Pixel Art',
};

/** Every game boots on `clasico`: a literal freeze of its original colors. */
export const DEFAULT_SKIN = 'clasico';

/** Storage key, aligned with `av_user` / `av_player_name`. */
function storageKey(gameId: string): string {
  return `av_skin_${gameId}`;
}

/**
 * Reads the saved skin for a game. Returns `fallback` on the server, so callers
 * must invoke this from a `useEffect` and never from a `useState` initializer,
 * or the first client render will not match the server HTML.
 *
 * `legacyKey` covers games that persisted their skin before this module existed.
 */
export function getSavedSkin(
  gameId: string,
  fallback: string = DEFAULT_SKIN,
  legacyKey?: string,
): string {
  if (typeof window === 'undefined') return fallback;
  try {
    const saved = localStorage.getItem(storageKey(gameId));
    if (saved) return saved;
    if (legacyKey) return localStorage.getItem(legacyKey) ?? fallback;
    return fallback;
  } catch {
    // localStorage can throw (private mode, blocked cookies) — fall back quietly.
    return fallback;
  }
}

/** Persists the chosen skin for a game. */
export function saveSkin(gameId: string, key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(gameId), key);
  } catch {
    // Not persisting a skin preference is not worth breaking the run for.
  }
}

/** Label for a skin key, falling back to the raw key if it is unknown. */
export function skinLabel(key: string): string {
  return SKIN_LABELS[key] ?? key;
}

/**
 * `#rrggbb` (or `#rgb`) + alpha -> `rgba(r,g,b,a)`, for canvas fills that need
 * a translucent version of a skin color.
 */
export function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
