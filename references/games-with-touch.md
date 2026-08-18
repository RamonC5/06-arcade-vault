# Juegos con controles táctiles

Registro de qué juegos de Arcade Vault tienen botonera táctil (spec
`10-mobile-touch-controls`) y qué `TOUCH_LAYOUT` usa cada uno. La botonera se monta en la
play-page solo cuando `useCoarsePointer()` (`lib/gameInput.ts`) es `true`; el componente del
juego expone su handle imperativo (`GameInput`) a través de la prop opcional `inputRef`.

Estados: `Sin controles táctiles` · `Completo`

## Índice

| Juego       | Estado   | dpad                         | actions                 | `--crt-ratio` (escritorio / táctil) |
| ----------- | -------- | ---------------------------- | ----------------------- | ----------------------------------- |
| `asteroids` | Completo | ◀ hold, ▶ hold               | IMPULSO hold, FUEGO tap | `4 / 3` / `4 / 3`                   |
| `arkanoid`  | Completo | ◀ hold, ▶ hold               | —                       | `4 / 3` / `4 / 3`                   |
| `snake`     | Completo | ▲ tap, ◀ tap, ▼ tap, ▶ tap   | —                       | `1 / 1` / `1 / 1`                   |
| `tetris`    | Completo | ◀ repeat, ▼ repeat, ▶ repeat | GIRAR tap, CAÍDA tap    | `3 / 4` / `1 / 2`                   |

## Notas por juego

- **`asteroids`** — `applyKey(code, down)` en `components/games/AsteroidsGame.tsx` es la
  primitiva compartida por teclado y táctil. `fire` es `tap`: `press`+`release` seguidos
  reproducen un par keydown/keyup, así que `pressed('Space')` dispara una sola bala.
- **`arkanoid`** — mismo patrón con `applyKey(key, down)`. El listener `mousemove` del canvas
  se conserva intacto para escritorio; los botones solo alimentan `keys.ArrowLeft/Right`.
- **`snake`** — `setDirection(dx, dy)` conserva el filtro de giro de 180° ya existente.
  `release` es un no-op: las cuatro direcciones son taps discretos.
- **`tetris`** — `doAction(code)` reutiliza el `switch` original de `onKeyDown` (incluye el
  atajo `KeyX` para girar, que el teclado sigue ofreciendo). `left`/`down`/`right` son
  `repeat`: cada llamada de `press()` mueve la pieza un paso, igual que el auto-repeat del
  teclado. Único juego con `--crt-ratio` distinto entre escritorio y táctil, y con los dos
  `<canvas>` (`tablero` + `siguiente pieza`) responsivos vía `aspect-ratio` — ver
  `.tetris-stage` / `.tetris-board` / `.tetris-next` en `app/globals.css`.

## Compartido

- `lib/gameInput.ts` — tipos (`GameAction`, `GameInput`, `TouchMode`, `TouchButton`,
  `TouchLayout`), `REPEAT_DELAY` (250 ms), `REPEAT_RATE` (120 ms) y el hook
  `useCoarsePointer()`.
- `components/TouchControls.tsx` — botonera DOM; traduce `pointerdown`/`pointerup`/
  `pointercancel` a `press`/`release` según el modo (`hold` / `tap` / `repeat`) de cada botón.
- `lib/useFullscreen.ts` — hook `{ ref, active, toggle }` para el botón PANTALLA COMPLETA de
  las cuatro play-pages (Fullscreen API nativa + fallback CSS `.av-stage-fs`).
- Ninguno de los cuatro juegos soporta gestos (swipe, arrastre de pala): fuera de alcance de
  esta spec, ver `specs/10-mobile-touch-controls.md`.
