# Juegos con skins

Registro de qué juegos de Arcade Vault tienen sistema de skins y cuáles ofrecen. El agente
`skin-designer` lee este archivo antes de tocar nada y actualiza **solo la fila del juego que ha
trabajado** en esa ejecución.

Todo juego debe ofrecer al menos `clasico` (default), `retro` y `neon`, y las tres deben ser
legibles sobre el fondo oscuro del sitio (`--bg: #0a0a0f`).

Estados: `Sin skins` · `Parcial` · `Completo`

## Índice

| Juego       | Estado    | clasico | retro | neon | Extras            | Fuente de color       | Ronda |
| ----------- | --------- | ------- | ----- | ---- | ----------------- | --------------------- | ----- |
| `tetris`    | Parcial   | —       | ✅    | ✅   | `pastel`, `pixel` | Registro `SKINS`      | —     |
| `snake`     | Sin skins | —       | —     | —    | —                 | Literales en `draw()` | —     |
| `asteroids` | Completo  | ✅      | ✅    | ✅   | —                 | Registro `SKINS`      | 01    |
| `arkanoid`  | Sin skins | —       | —     | —    | —                 | Spritesheet           | —     |

## Rondas

### Ronda 00 — línea base (2026-08-17)

Ronda de inicialización: se crea el registro sin haber tocado ningún juego todavía.

**Catálogo:** 4 juegos implementados. 1 con sistema de skins (`tetris`), 3 sin él.

**Estado por juego:**

- `tetris` — **Parcial**. Único juego con el sistema montado: `type Skin` y registro `SKINS` en
  `components/games/TetrisGame.tsx:14-155`, prop `skinKey?` (`:7`) con default `'retro'` (`:208`),
  `skinRef` (`:218`) y efecto de sincronización (`:227-229`) que permite cambiar de skin sin
  reiniciar la partida. Selector `<select>` en el HUD y persistencia en
  `app/games/tetris/play/page.tsx:12-22,35-37,54-57,94-117` (clave `tetris-skin`). Le falta
  `clasico`.
- `snake` — **Sin skins**. 9 literales de color dentro de un único `draw()`
  (`components/games/SnakeGame.tsx:147,151,171,185,219,225,229`). El caso más barato de portar. El
  sprite `fruits.png` es neutro y no necesita re-teñido.
- `asteroids` — **Sin skins**. 8 literales repartidos en 5 métodos `draw()`
  (`components/games/AsteroidsGame.tsx:113,172,246,261,296,434,448,458`), todos en el mismo closure
  que `ctx`. `:296` calcula el color con alfa en un template literal y necesitará un helper
  `hexToRgba`.
- `arkanoid` — **Sin skins**. El caso duro: solo 2 literales (`:410`, `:441`) porque todo lo visual
  sale de `/spritesheet-breakout.png` vía `BLOCK_SPRITES` (`:73-84`) y `EXPLOSION_FRAMES` (`:15-61`).
  La hoja ya se blitea a un canvas offscreen en `:496-508`, así que la vía es teñir ese offscreen
  por skin. Su efecto tiene deps **no vacías** (`:519`), a diferencia de los otros tres.

**Deuda conocida:** la skin `pastel` de Tetris usa `boardBg: '#f8f0ff'`
(`components/games/TetrisGame.tsx:98`) — un tablero claro dentro del marco `.crt` sobre un sitio
oscuro. Falla el criterio 1 de la rúbrica y debe corregirse cuando se trabaje `tetris`.

**Compartidos:** `lib/skins.ts` y `components/SkinPicker.tsx` **no existen todavía**. Los creará la
primera ejecución que los necesite.

**Pendientes:** `snake`, `asteroids`, `arkanoid` (sin skins) y `tetris` (le falta `clasico`).

### Ronda 01 — 2026-08-17 — `asteroids`

**Estado previo:** Sin skins. 8 literales de color repartidos en 5 métodos `draw()`
(`#fff` en nave, asteroides, balas, partículas, iconos de vida y HUD; `#000` de fondo;
`rgba(255, 130, 0, 0.85)` en la llama del propulsor), sin `skinKey`, sin selector.

**Paletas añadidas:**

- `clasico` (default) — congela literalmente la paleta original: vectores blancos sobre negro puro
  (`#000000`) y propulsor naranja. `#fff` → `#ffffff`, `#000` → `#000000` y
  `rgba(255, 130, 0, 0.85)` → `hexToRgba('#ff8200', 0.85)` son el mismo color exacto (0x82 = 130).
  `lineWidth: 1.5`, `hudFont: '15px monospace'`, `glow: 0` y ambos `*FillAlpha: 0`, así que no se
  emite ni una llamada de dibujo nueva: la refactorización es neutra a nivel de píxel.
- `retro` — tubo de fósforo ámbar. Gama corta y cálida, bordes duros, `glow: 0` y trazo más grueso
  (`lineWidth: 2`). La nave es lo más brillante de la pantalla (`#ffd27f`) y las rocas caen dos
  escalones de luminancia por debajo (`#9c8550`), con acento de fósforo verde solo en el nivel del
  HUD (`#7fd06a`).
- `neon` — identidad de Arcade Vault: un token de la casa por entidad para separar los tonos al
  máximo — nave `--cyan #00f5ff`, asteroides `--magenta #ff006e`, balas `--yellow #f5ff00`,
  partículas y propulsor `--green #00ff88`. Técnica de `TetrisGame`: `shadowBlur` 12 + relleno a
  baja alfa (`0.18` nave, `0.14` asteroides) y trazo brillante.

**Rúbrica de contraste** (luminancia relativa WCAG; el fondo del sitio `--bg #0a0a0f` tiene
L = 0.00316). Los elementos con alfa se evalúan ya compuestos sobre el fondo de la skin:

| Skin      | Elemento              | Color                | Fondo     | Ratio    | Criterio | Veredicto |
| --------- | --------------------- | -------------------- | --------- | -------- | -------- | --------- |
| `clasico` | fondo                 | `#000000` (L 0.0000) | `#0a0a0f` | —        | 1 (≤ bg) | ✅        |
| `clasico` | nave / balas / rocas  | `#ffffff`            | `#000000` | 21.00:1  | 2 (≥4.5) | ✅        |
| `clasico` | HUD e iconos de vida  | `#ffffff`            | `#000000` | 21.00:1  | 5 (≥4.5) | ✅        |
| `clasico` | partículas            | `#ffffff`            | `#000000` | 21.00:1  | 3 (≥3)   | ✅        |
| `clasico` | propulsor (α 0.85)    | `#d96f00` efectivo   | `#000000` | 6.22:1   | 3 (≥3)   | ✅        |
| `retro`   | fondo                 | `#070604` (L 0.0018) | `#0a0a0f` | más osc. | 1 (≤ bg) | ✅        |
| `retro`   | nave                  | `#ffd27f`            | `#070604` | 14.25:1  | 2 (≥4.5) | ✅        |
| `retro`   | balas                 | `#fff8e2`            | `#070604` | 19.07:1  | 2 (≥4.5) | ✅        |
| `retro`   | asteroides            | `#9c8550`            | `#070604` | 5.68:1   | 2 (≥4.5) | ✅        |
| `retro`   | HUD puntuación        | `#e8b455`            | `#070604` | 10.70:1  | 5 (≥4.5) | ✅        |
| `retro`   | HUD nivel             | `#7fd06a`            | `#070604` | 10.74:1  | 5 (≥4.5) | ✅        |
| `retro`   | iconos de vida        | `#ffd27f`            | `#070604` | 14.25:1  | 5 (≥4.5) | ✅        |
| `retro`   | partículas            | `#7a6640`            | `#070604` | 3.67:1   | 3 (≥3)   | ✅        |
| `retro`   | propulsor (α 0.9)     | `#e66e18` efectivo   | `#070604` | 6.37:1   | 3 (≥3)   | ✅        |
| `neon`    | fondo                 | `#05050a` (L 0.0016) | `#0a0a0f` | más osc. | 1 (≤ bg) | ✅        |
| `neon`    | nave                  | `#00f5ff`            | `#05050a` | 15.02:1  | 2 (≥4.5) | ✅        |
| `neon`    | balas                 | `#f5ff00`            | `#05050a` | 18.58:1  | 2 (≥4.5) | ✅        |
| `neon`    | asteroides            | `#ff006e`            | `#05050a` | 5.30:1   | 2 (≥4.5) | ✅        |
| `neon`    | HUD puntuación / vida | `#00f5ff`            | `#05050a` | 15.02:1  | 5 (≥4.5) | ✅        |
| `neon`    | HUD nivel             | `#f5ff00`            | `#05050a` | 18.58:1  | 5 (≥4.5) | ✅        |
| `neon`    | partículas            | `#00ff88`            | `#05050a` | 15.17:1  | 3 (≥3)   | ✅        |
| `neon`    | propulsor (α 0.9)     | `#00e67b` efectivo   | `#05050a` | 12.21:1  | 3 (≥3)   | ✅        |

**Criterio 4 (separación mutua).** Los pares que el jugador debe distinguir en movimiento, medidos
en ratio de luminancia y en distancia de tono:

| Par                   | `retro`          | `neon`        |
| --------------------- | ---------------- | ------------- |
| nave vs asteroides    | 2.51:1           | 2.83:1 / 152° |
| asteroides vs balas   | 3.36:1           | 3.50:1 / 88°  |
| asteroides vs partíc. | 1.55:1           | 2.86:1 / 178° |
| nave vs balas         | 1.34:1 (ver ab.) | 1.24:1 / 120° |

**Fallos corregidos durante el diseño:** ninguno llegó al código. Dos ajustes previos a escribir:
el asteroide de `retro` bajó de `#b8a06a` a `#9c8550` (separación nave↔roca de 1.79:1 a 2.51:1,
manteniendo 5.68:1 contra el fondo) y la partícula de `#a08a5c` a `#7a6640` para despegarla del
tono del asteroide (1.26:1 → 1.55:1) sin bajar de 3:1.

**Deuda aceptada:** el par nave↔balas queda cerca en luminancia en las tres skins. En `clasico` son
literalmente el mismo `#ffffff` (es la paleta original congelada, no se toca); en `retro` van a
1.34:1 y en `neon` a 1.24:1 pero con 120° de diferencia de tono. No es un par crítico: la bala es un
punto de 2 px que sale de la propia nave y la separación real es de forma y tamaño, no de color. Los
pares que sí deciden partidas (nave↔asteroides y asteroides↔balas) superan 2.5:1 en ambas skins.

**Glow.** `shadowBlur` solo se activa en `neon` y nunca se contabiliza como contraste: todos los
ratios de la tabla están medidos con el color base y el glow apagado (criterio 7).

**Archivos tocados:** `components/games/AsteroidsGame.tsx`, `app/games/asteroids/play/page.tsx`,
`lib/skins.ts` (**creado**), `components/SkinPicker.tsx` (**creado**).

**Compartidos:** esta ronda estrena los dos únicos archivos compartidos. `lib/skins.ts` expone
`SKIN_LABELS`, `DEFAULT_SKIN`, `getSavedSkin(gameId, fallback?, legacyKey?)`, `saveSkin`,
`skinLabel` y `hexToRgba`; el tercer parámetro `legacyKey` existe para que `tetris` pueda leer su
antigua clave `tetris-skin` sin perder la preferencia guardada. `components/SkinPicker.tsx` es el
`<select>` dentro de un `.hud-stat`. Clave de storage `av_skin_asteroids`. Cada juego sigue
manteniendo su propio registro `SKINS` dentro de su componente.

**Notas de implementación:** `skinKey?` con default `'clasico'`, `skinRef` + efecto de
sincronización, y una sola lectura `skin = skinRef.current` al principio de `draw()` — todos los
métodos de dibujo comparten ese closure igual que comparten `ctx`, así que el efecto del game loop
mantiene sus deps `[]` y cambiar de skin no reinicia la partida ni resetea la puntuación.

**Lint:** `npx tsc --noEmit` limpio. El `<select>` reproduce el patrón canónico de
`tetris/play/page.tsx:35-37` (lectura de `localStorage` en `useEffect`, no en el inicializador de
`useState`, para no romper la hidratación). Eso hace saltar `react-hooks/set-state-in-effect`, regla
que ya salta hoy en las cuatro play-pages del repo (`tetris:36,50`, `snake:33`, `arkanoid:33`,
`asteroids:49`): es deuda preexistente del repo, no introducida aquí, y se ha preferido mantener la
coherencia con el molde antes que divergir en un solo juego.

**Pendientes:** `snake` y `arkanoid` (sin skins) y `tetris` (le falta `clasico`; además su skin
`pastel` sigue con `boardBg: '#f8f0ff'`, que incumple el criterio 1).
