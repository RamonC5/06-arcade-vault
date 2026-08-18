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
| `snake`     | Completo  | ✅      | ✅    | ✅   | —                 | Registro `SKINS`      | 03    |
| `asteroids` | Completo  | ✅      | ✅    | ✅   | —                 | Registro `SKINS`      | 01    |
| `arkanoid`  | Completo  | ✅      | ✅    | ✅   | —                 | Spritesheet teñido    | 02    |

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

### Ronda 02 — 2026-08-17 — `arkanoid`

**Estado previo:** Sin skins. Solo 2 literales de color en el componente (`:410` fondo `#000`, `:441`
HUD `#fff`) porque **todo lo demás sale de `/spritesheet-breakout.png`** vía `BLOCK_SPRITES` (7
colores de bloque), `SPRITES` (pala y bola) y `EXPLOSION_FRAMES` (7 colores × 4 fotogramas). Sin
`skinKey`, sin selector, y con un `useEffect` de deps **no vacías** — el único de los cuatro juegos.

**Vía elegida para el reteñido (sin PNGs nuevos).** La hoja ya se bliteaba a un canvas offscreen en
el `onload` (`:496-508`). Sobre ese canvas se genera, **una vez por skin y por tile** y con caché
(`Map` keyed `skin.id|tile`), una copia teñida con `globalCompositeOperation = 'source-in'`: conserva
la silueta alfa del sprite y repinta cada píxel opaco con el color de la skin. Ventajas: el color
renderizado es **exactamente** el de la paleta (ratio de contraste predecible al dígito, no una
mezcla con el sombreado original), coste cero por frame y ni un asset binario nuevo. `clasico` no
teñe nada (`tint: null`) y sigue bliteando la hoja intacta.

**Paletas añadidas:**

- `clasico` (default) — congelación literal: hoja intacta, fondo `#000000`, HUD `#ffffff` en
  `bold 18px monospace`. `tint: null` + `blockInset: 0` + `blockFillAlpha: 1` + `blockStroke: false`
  + `glow: 0` hacen que las llamadas de dibujo emitidas sean las mismas de antes, en el mismo orden y
  con las mismas coordenadas. Se verificó que los colores del sprite son los que ya se veían
  muestreando el PNG con `sharp` (cuerpo de cada bloque, pala `#babac5`, bola `#babac5`).
- `retro` — tubo de fósforo ámbar. Teñido plano opaco, bordes duros, `glow: 0`, `blockInset: 1` (el
  surco de 1 px que el teñido plano borraría, para que una fila de 10 bloques no lea como una barra
  sólida). Los 7 colores se reparten en una escalera de luminancia (magenta el más apagado, yellow el
  más brillante) con **dos escalones de verde fósforo** (`green`, `cyan`) rompiendo la tirada ámbar,
  que es lo que permite separar 6 filas simultáneas dentro de una gama deliberadamente corta.
- `neon` — identidad de Arcade Vault con la técnica de `TetrisGame:53-84`: cuerpo translúcido
  (`blockFillAlpha: 0.75`) + trazo brillante a alfa completa (`1.5px`) + `shadowBlur: 12`. Usa los
  cuatro tokens de la casa (`--cyan #00f5ff` cyan y pala, `--magenta #ff006e` red, `--yellow #f5ff00`
  yellow, `--green #00ff88` nivel del HUD) más tres hues derivados (violeta `#a95cff`, naranja
  `#ff8a00`, esmeralda `#00c46a`) y un acero desaturado (`#98a0b0`) para el bloque `gray`, de modo
  que los 7 keys queden repartidos por la rueda de tono. Bola blanca: es el objeto que hay que seguir
  sobre 7 colores saturados y el blanco es el único que no se confunde con ninguno.

**Rúbrica de contraste** (luminancia relativa WCAG, calculada con script sobre los píxeles reales del
spritesheet; `--bg #0a0a0f` tiene L = 0.00316). El "cuerpo" de un bloque de `clasico` es su píxel más
frecuente; en `retro`/`neon` el color renderizado **es** el de la paleta porque el teñido es plano.

| Skin      | Elemento         | Color                | Fondo     | Ratio   | Criterio | Veredicto        |
| --------- | ---------------- | -------------------- | --------- | ------- | -------- | ---------------- |
| `clasico` | fondo            | `#000000` (L 0.0000) | `#0a0a0f` | —       | 1 (≤ bg) | OK               |
| `clasico` | bloque `gray`    | `#323142` cuerpo     | `#000000` | 1.65:1  | 2 (≥4.5) | FALLO heredado   |
| `clasico` | bloque `magenta` | `#632ff4` cuerpo     | `#000000` | 3.24:1  | 2 (≥4.5) | FALLO heredado   |
| `clasico` | bloque `red`     | `#c02a3e` cuerpo     | `#000000` | 3.64:1  | 2 (≥4.5) | FALLO heredado   |
| `clasico` | bloque `hotpink` | `#fc7d1c` cuerpo     | `#000000` | 8.09:1  | 2 (≥4.5) | OK               |
| `clasico` | bloque `green`   | `#44aaf3` cuerpo     | `#000000` | 8.29:1  | 2 (≥4.5) | OK               |
| `clasico` | bloque `cyan`    | `#4fc99c` cuerpo     | `#000000` | 10.17:1 | 2 (≥4.5) | OK               |
| `clasico` | bloque `yellow`  | `#d9bd4c` cuerpo     | `#000000` | 11.33:1 | 2 (≥4.5) | OK               |
| `clasico` | pala             | `#babac5` cuerpo     | `#000000` | 10.92:1 | 2 (≥4.5) | OK               |
| `clasico` | bola             | `#babac5` cuerpo     | `#000000` | 10.92:1 | 2 (≥4.5) | OK               |
| `clasico` | HUD y vidas      | `#ffffff`            | `#000000` | 21.00:1 | 5 (≥4.5) | OK               |
| `retro`   | fondo            | `#070604` (L 0.0018) | `#0a0a0f` | más osc | 1 (≤ bg) | OK               |
| `retro`   | bloque `magenta` | `#a86a34`            | `#070604` | 4.61:1  | 2 (≥4.5) | OK               |
| `retro`   | bloque `red`     | `#d9762a`            | `#070604` | 6.34:1  | 2 (≥4.5) | OK               |
| `retro`   | bloque `gray`    | `#969084`            | `#070604` | 6.38:1  | 2 (≥4.5) | OK               |
| `retro`   | bloque `green`   | `#7fb04a`            | `#070604` | 7.92:1  | 2 (≥4.5) | OK               |
| `retro`   | bloque `hotpink` | `#e8a04a`            | `#070604` | 9.22:1  | 2 (≥4.5) | OK               |
| `retro`   | bloque `cyan`    | `#aad46e`            | `#070604` | 11.91:1 | 2 (≥4.5) | OK               |
| `retro`   | bloque `yellow`  | `#f5d070`            | `#070604` | 13.64:1 | 2 (≥4.5) | OK               |
| `retro`   | pala             | `#ffc46a`            | `#070604` | 12.88:1 | 2 (≥4.5) | OK               |
| `retro`   | bola             | `#fffdf2`            | `#070604` | 19.85:1 | 2 (≥4.5) | OK               |
| `retro`   | HUD puntuación   | `#e8b455`            | `#070604` | 10.70:1 | 5 (≥4.5) | OK               |
| `retro`   | HUD nivel        | `#8fd06a`            | `#070604` | 10.99:1 | 5 (≥4.5) | OK               |
| `neon`    | fondo            | `#05050a` (L 0.0016) | `#0a0a0f` | más osc | 1 (≤ bg) | OK               |
| `neon`    | `red` trazo      | `#ff006e`            | `#05050a` | 5.30:1  | 2 (≥4.5) | OK               |
| `neon`    | `red` cuerpo     | `#c10155` (α 0.75)   | `#05050a` | 3.28:1  | 3 (≥3)   | OK               |
| `neon`    | `magenta` trazo  | `#a95cff`            | `#05050a` | 5.48:1  | 2 (≥4.5) | OK               |
| `neon`    | `magenta` cuerpo | `#8046c2` (α 0.75)   | `#05050a` | 3.46:1  | 3 (≥3)   | OK               |
| `neon`    | `gray` trazo     | `#98a0b0`            | `#05050a` | 7.74:1  | 2 (≥4.5) | OK               |
| `neon`    | `gray` cuerpo    | `#737987` (α 0.75)   | `#05050a` | 4.67:1  | 3 (≥3)   | OK               |
| `neon`    | `hotpink` trazo  | `#ff8a00`            | `#05050a` | 8.61:1  | 2 (≥4.5) | OK               |
| `neon`    | `hotpink` cuerpo | `#c16903` (α 0.75)   | `#05050a` | 5.10:1  | 3 (≥3)   | OK               |
| `neon`    | `green` trazo    | `#00c46a`            | `#05050a` | 8.82:1  | 2 (≥4.5) | OK               |
| `neon`    | `green` cuerpo   | `#019452` (α 0.75)   | `#05050a` | 5.21:1  | 3 (≥3)   | OK               |
| `neon`    | `cyan` trazo     | `#00f5ff`            | `#05050a` | 15.02:1 | 2 (≥4.5) | OK               |
| `neon`    | `cyan` cuerpo    | `#01b9c2` (α 0.75)   | `#05050a` | 8.44:1  | 3 (≥3)   | OK               |
| `neon`    | `yellow` trazo   | `#f5ff00`            | `#05050a` | 18.58:1 | 2 (≥4.5) | OK               |
| `neon`    | `yellow` cuerpo  | `#b9c103` (α 0.75)   | `#05050a` | 10.31:1 | 3 (≥3)   | OK               |
| `neon`    | pala             | `#00f5ff`            | `#05050a` | 15.02:1 | 2 (≥4.5) | OK               |
| `neon`    | bola y vidas     | `#ffffff`            | `#05050a` | 20.34:1 | 2 (≥4.5) | OK               |
| `neon`    | HUD puntuación   | `#00f5ff`            | `#05050a` | 15.02:1 | 5 (≥4.5) | OK               |
| `neon`    | HUD nivel        | `#00ff88`            | `#05050a` | 15.17:1 | 5 (≥4.5) | OK               |

**Criterio 4 (separación mutua).** Se evaluaron los 20 pares de colores de bloque que llegan a
coexistir en un mismo nivel (`LEVELS` reparte 6 filas por pantalla y usa los 7 keys entre los 5
niveles), con la regla "pasa si el ratio de luminancia ≥ 1.3 **o** la distancia de tono ≥ 40°".
**Pares débiles: 0 en las tres skins.** Los más justos:

| Par                | `clasico`      | `retro`        | `neon`          |
| ------------------ | -------------- | -------------- | --------------- |
| `red` vs `magenta` | 1.12 / 96°     | 1.38 / 2°      | 1.03 / 66°      |
| `cyan` vs `green`  | 1.23 / 47°     | 1.50 / 4°      | 1.70 / 30°      |
| `hotpink` vs `gre` | 1.02 / 179°    | 1.16 / 56°     | 1.02 / 120°     |
| `gray` vs `magent` | 1.96 / 12°     | 1.39 / 12°     | 1.41 / 48°      |
| bola vs `yellow`   | 1.04 (heredado)| 1.46           | 1.97 (cuerpo)   |

**Fallos corregidos durante el diseño (ninguno llegó al código):** cuatro iteraciones de paleta antes
de escribir nada.

1. Primer intento de `retro` con teñido `source-atop` (α 0.82, conservando el biselado del sprite):
   el 18 % de sprite original que asomaba contaminaba los tintes y dejaba `magenta` en 3.41:1. Se
   cambió a teñido plano `source-in`, que da control exacto del color, y se compensó la pérdida del
   borde negro con `blockInset: 1`.
2. `retro`: `magenta` subió de `#9c5a28` a `#a86a34` (3.41 → 4.61:1) y `yellow` bajó de `#ffe6ad` a
   `#f5d070` para despegar la bola del bloque amarillo (1.13 → 1.46).
3. `neon`: el relleno de bloque a α 0.72 dejaba `magenta` en 2.89:1 (criterio 3). Se subió a α 0.75 y
   el violeta de `#9d4bff` a `#a95cff` → 3.46:1.
4. `neon`: primera propuesta con `green` = `--green #00ff88` chocaba con `--cyan` (1.00 de ratio de
   luminancia y solo 29° de tono, y coexisten en 3 de los 5 niveles). Se oscureció a `#00c46a`
   (1.70 / 30°) y el token `--green` se reubicó en el nivel del HUD. Igual con `gray`: `#7b8290`
   quedaba a 1.11 de `magenta`, se subió a `#98a0b0` (1.41 / 48°).

**Deuda heredada y aceptada (`clasico`).** Los bloques `gray` (1.65:1), `magenta` (3.24:1) y `red`
(3.64:1) del spritesheet original no llegan a 4.5:1 sobre negro, y el par bola↔bloque amarillo va a
1.04. Es el aspecto que el juego tiene hoy y `clasico` es una congelación literal: corregirlo sería
justo el bug que esta ronda debe evitar. Ambos problemas quedan resueltos en `retro` (peor bloque
4.61:1) y en `neon` (peor trazo 5.30:1), que es la vía ofrecida al jugador que necesite más
legibilidad.

**Glow.** `shadowBlur` solo se activa en `neon` (bloques, explosiones, pala, bola y texto del HUD) y
no se contabiliza como contraste: todos los ratios de la tabla están medidos con el color base y el
glow apagado (criterio 7).

**Archivos tocados:** `components/games/ArkanoidGame.tsx`, `app/games/arkanoid/play/page.tsx`.

**Compartidos:** `lib/skins.ts` y `components/SkinPicker.tsx` se reutilizaron **sin modificarlos**.
Arkanoid no necesitó nada nuevo de ellos: no usa `hexToRgba` porque su transparencia se resuelve con
`globalAlpha` sobre un tile ya teñido, y no necesita `legacyKey` porque nunca persistió una skin
antes. Clave de storage `av_skin_arkanoid`. El registro `SKINS` vive dentro del componente, como en
los demás juegos.

**Notas de implementación:** `skinKey?` con default `'clasico'`, `skinRef` + efecto de sincronización
y una sola lectura `skin = skinRef.current` al principio de `draw()`. Las deps del efecto del game
loop se dejaron **exactamente como estaban** (`[onScoreChange, onLivesChange, onLevelChange,
onGameOver]`, todas `useCallback([])` en la play-page): `skinKey` no entra ahí, así que cambiar de
skin no reinicia la partida, no resetea la puntuación, no recarga el nivel ni vuelve a pedir el PNG.
`restart()` tampoco toca la skin elegida.

**Verificación:** `npx tsc --noEmit` limpio. `npm run lint` no reporta nada en `ArkanoidGame.tsx`. En
`arkanoid/play/page.tsx` salta `react-hooks/set-state-in-effect` en las dos lecturas de
`localStorage` (la de `av_player_name`, que ya existía, y la de la skin): es el patrón canónico de
hidratación segura de `tetris/play/page.tsx:35-37` y la misma regla salta hoy en las **cinco**
play-pages del repo (`[id]`, `tetris`, `snake`, `arkanoid`, `asteroids`). Deuda preexistente del
repo, no introducida aquí.

**Pendientes:** `snake` (sin skins, en curso en otra ejecución paralela de esta misma ronda) y
`tetris` (le falta `clasico`; además su skin `pastel` sigue con `boardBg: '#f8f0ff'`, que incumple el
criterio 1).

### Ronda 03 — 2026-08-17 — `snake`

**Estado previo:** Sin skins. 10 literales de color/estilo dentro de un único `draw()`
(`components/games/SnakeGame.tsx:147,151,171,185,219,222,225,229`): fondo `#0a1a0a`, rejilla
`rgba(0,255,80,0.06)`, cabeza `#00ff50`, cuerpo `#00cc40`, ojos `#001a00`, barra del HUD
`rgba(0,0,0,0.55)`, `SCORE` `#00ff80`, `LEVEL` `#80ffcc`, más `lineWidth` de rejilla y fuente del
HUD. Sin `skinKey`, sin `skinRef`, sin selector. El sprite `fruits.png` es neutro y **no** se
re-tiñe.

**Auditoría de entrada:**

```
Juego:            snake
skinKey:          no
Registro SKINS:   no
Faltan:           clasico, retro, neon
Fuente de color:  literales en draw()
Selector en HUD:  no
Veredicto:        Sin skins
```

**Paletas añadidas:**

- `clasico` (default) — congela literalmente la paleta original. Los 10 literales pasan al registro
  sin tocar un solo valor: `hexToRgba('#00ff50', 0.06)` devuelve exactamente `rgba(0,255,80,0.06)` y
  `hexToRgba('#000000', 0.55)` exactamente `rgba(0,0,0,0.55)`, así que las cadenas que recibe el
  contexto son idénticas. La rampa de alfa de la cola se generalizó a
  `max(tailMinAlpha, tailAlpha - i * tailFade)` con `1 / 0.03 / 0.4`, que es literalmente la
  expresión anterior. Verificado a máquina: 10/10 literales iguales carácter a carácter y alfa +
  geometría (padding, radio, radio de ojo) idénticas en los 40 primeros segmentos. `glow: 0`, así
  que no se emite ni una llamada de dibujo nueva.
- `retro` — tubo de arcade de **doble fósforo**: serpiente ámbar (`#ffdf9b` cabeza, `#d68e24`
  cuerpo) sobre una graticula verde apagada (`#4a6b43`). Bordes duros (`headRadius: 1`,
  `bodyRadius: 0`), sin `shadowBlur` y cuerpo de brillo uniforme (`tailFade: 0`) porque un tubo de
  fósforo no tiene rampa de alfa. HUD ámbar `#ffb000` + nivel en verde fósforo `#7fd06a`,
  coherente con el `retro` de asteroids (Ronda 01).
- `neon` — identidad de Arcade Vault con los cuatro tokens de la casa y `shadowBlur: 12`: cabeza
  `--yellow #f5ff00`, cuerpo `--green #00ff88` (la serpiente sigue leyéndose como serpiente),
  rejilla `--cyan #00f5ff` y nivel del HUD `--magenta #ff006e`. Los ojos se «perforan» con el
  color del tablero (`#05050a`). El glow se apaga justo antes de dibujar los ojos, el sprite de
  fruta y el HUD, para que ninguno herede halo.

**Rúbrica de contraste** (luminancia relativa WCAG; el fondo del sitio `--bg #0a0a0f` tiene
L = 0.00316). Los elementos con alfa se evalúan ya compuestos sobre el fondo de la skin:

| Skin      | Elemento              | Color (compuesto)          | Fondo     | Ratio     | Criterio  | Veredicto |
| --------- | --------------------- | -------------------------- | --------- | --------- | --------- | --------- |
| `clasico` | fondo                 | `#0a1a0a` (L 0.00825)      | `#0a0a0f` | 1.10      | 1 (≤ bg)  | ⚠️ ver ab. |
| `clasico` | rejilla               | `#09280e` (`#00ff50` α.06) | `#0a1a0a` | 1.13      | 3 (≥3)    | ❌ heredado |
| `clasico` | cabeza                | `#00ff50`                  | `#0a1a0a` | 13.24:1   | 2 (≥4.5)  | ✅        |
| `clasico` | cuerpo i=1 (α 0.97)   | `#00c73e`                  | `#0a1a0a` | 7.93:1    | 2 (≥4.5)  | ✅        |
| `clasico` | cola, suelo (α 0.40)  | `#066120`                  | `#0a1a0a` | 2.35:1    | 2 (≥4.5)  | ❌ heredado |
| `clasico` | ojos (sobre cabeza)   | `#001a00`                  | `#00ff50` | 13.43:1   | 4 (vs cab.)| ✅        |
| `clasico` | HUD `SCORE`           | `#00ff80`                  | `#050c05` | 14.71:1   | 5 (≥4.5)  | ✅        |
| `clasico` | HUD `LEVEL`           | `#80ffcc`                  | `#050c05` | 16.11:1   | 5 (≥4.5)  | ✅        |
| `retro`   | fondo                 | `#0a0703` (L 0.00223)      | `#0a0a0f` | más osc.  | 1 (≤ bg)  | ✅        |
| `retro`   | rejilla               | `#4a6b43`                  | `#0a0703` | 3.33:1    | 3 (≥3)    | ✅        |
| `retro`   | cabeza                | `#ffdf9b`                  | `#0a0703` | 15.59:1   | 2 (≥4.5)  | ✅        |
| `retro`   | cuerpo (α 1, uniforme)| `#d68e24`                  | `#0a0703` | 7.42:1    | 2 (≥4.5)  | ✅        |
| `retro`   | ojos (sobre cabeza)   | `#241703`                  | `#ffdf9b` | 13.58:1   | 4 (vs cab.)| ✅        |
| `retro`   | HUD `SCORE`           | `#ffb000`                  | `#040301` | 11.25:1   | 5 (≥4.5)  | ✅        |
| `retro`   | HUD `LEVEL`           | `#7fd06a`                  | `#040301` | 10.93:1   | 5 (≥4.5)  | ✅        |
| `neon`    | fondo                 | `#05050a` (L 0.00163)      | `#0a0a0f` | más osc.  | 1 (≤ bg)  | ✅        |
| `neon`    | rejilla               | `#036a71` (`#00f5ff` α.42) | `#05050a` | 3.20:1    | 3 (≥3)    | ✅        |
| `neon`    | cabeza                | `#f5ff00`                  | `#05050a` | 18.58:1   | 2 (≥4.5)  | ✅        |
| `neon`    | cuerpo i=1 (α 0.83)   | `#01d473`                  | `#05050a` | 10.33:1   | 2 (≥4.5)  | ✅        |
| `neon`    | cola, suelo (α 0.70)  | `#02b462`                  | `#05050a` | 7.46:1    | 2 (≥4.5)  | ✅        |
| `neon`    | ojos (sobre cabeza)   | `#05050a`                  | `#f5ff00` | 18.58:1   | 4 (vs cab.)| ✅        |
| `neon`    | HUD `SCORE`           | `#00f5ff`                  | `#020204` | 15.31:1   | 5 (≥4.5)  | ✅        |
| `neon`    | HUD `LEVEL`           | `#ff006e`                  | `#020204` | 5.41:1    | 5 (≥4.5)  | ✅        |

**Criterio 4 (separación mutua).** Pares que el jugador debe distinguir en movimiento:

| Par                | `clasico`      | `retro`        | `neon`         |
| ------------------ | -------------- | -------------- | -------------- |
| cabeza vs cuerpo   | 1.67:1 / 0°    | 2.10:1 / 5°    | 1.80:1 / 90°   |
| cuerpo vs rejilla  | 6.99:1 / 9°    | 2.23:1 / 74°   | 3.23:1 / 32°   |
| cola vs rejilla    | 2.07:1         | 2.23:1         | 2.33:1         |
| cabeza vs rejilla  | 11.67:1        | 4.68:1         | 5.81:1         |
| `SCORE` vs `LEVEL` | 1.09:1 / 6°    | 1.03:1 / 66°   | 2.83:1 / 152°  |

**Criterio 6 (nada jugable por debajo de ~`#1a1a1a`).** Ningún elemento sobre el fondo lo incumple:
lo más oscuro que se dibuja contra el tablero es la cola de `neon` a su suelo de alfa (`#02b462`,
7.46:1). Los tres ojos sí quedan por debajo (`#001a00`, `#241703`, `#05050a`) pero **nunca se
dibujan sobre el fondo**: son un recorte dentro de la cabeza y se evalúan contra ella (13.43 / 13.58
/ 18.58), que es la lectura que importa.

**Criterio 7 (el glow no cuenta).** `shadowBlur` solo se activa en `neon` (12 px) y todos los ratios
de arriba están medidos con el color base y el glow apagado.

**Fallos corregidos antes de escribir código** (3 iteraciones de cálculo, ninguno llegó al repo):

1. Rejilla de `retro`, intento 1: ámbar `#ffb000` @0.48 → compuesto `#805802`, 3.17:1 contra el
   fondo pero solo **2.36:1** contra el cuerpo ámbar y de la misma familia de tono. Descartada por
   riesgo de emborronar cuerpo y rejilla.
2. Rejilla de `retro`, intento 2: gris cálido `#cbc0a4` @0.42 → **2.71:1**, incumple el criterio 3.
   Descartada.
3. Rejilla de `retro`, final: graticula de fósforo verde `#4a6b43` → 3.33:1 contra el fondo y **74°**
   de tono respecto al cuerpo ámbar. De paso el cuerpo subió de `#c9821f` (6.41:1) a `#d68e24`
   (7.42:1) para abrir hueco sobre una rejilla anclada en el mínimo de 3:1.
4. `neon`, cabeza vs cuerpo: con ambos tokens a alfa plena el par quedaba en **1.28:1**. Se bajó
   `tailAlpha` a 0.85 (knob de forma, no de color) → **1.80:1** sin renunciar a ningún token.
5. `neon`, suelo de la cola: a 0.55 la cola (`#028f4f`) quedaba a **1.53:1** de la rejilla cian. Se
   subió el suelo a 0.70 → 2.33:1 de la rejilla y 7.46:1 contra el fondo.

**Deuda heredada aceptada (solo `clasico`).** Tres medidas de `clasico` no pasan la rúbrica, y las
tres son de la paleta original: la rejilla a 1.13:1 (alfa 0.06 — prácticamente invisible bajo las
scanlines y el ruido a `opacity: 0.35`), la cola a partir del segmento 20 a 2.35:1, y un fondo
`#0a1a0a` un 1.10:1 más luminoso que el del sitio. No se corrigen **por definición**: `clasico` es la
congelación literal del aspecto de hoy y cualquier cambio ahí sería romper el juego, no mejorarlo.
`retro` y `neon` arreglan los tres puntos (rejilla 3.33 / 3.20, cola 7.42 / 7.46, fondos por debajo
de `--bg`), así que el jugador tiene dos skins que sí cumplen.

**Deuda aceptada (diseño).** El par cabeza↔cuerpo de `retro` queda a 5° de tono: es inherente a un
tubo monocromo y se compensa con 2.10:1 de luminancia más las señales de forma (padding 2 vs 3,
radio 1 vs 0 y los dos ojos). El par `SCORE`↔`LEVEL` va justo de luminancia en `clasico` y `retro`,
pero son textos estáticos, etiquetados y en esquinas opuestas de la barra, no entidades a seguir.

**Archivos tocados:** `components/games/SnakeGame.tsx`, `app/games/snake/play/page.tsx`.

**Compartidos:** ninguno modificado. `lib/skins.ts` y `components/SkinPicker.tsx` se reutilizan tal
cual desde la Ronda 01: `hexToRgba` cubrió los dos únicos colores con alfa (rejilla y barra del HUD)
sin parseo manual, `SKIN_LABELS` ya traía `clasico`/`retro`/`neon` y `getSavedSkin`/`saveSkin`
resolvieron la persistencia. **Sin peticiones pendientes** contra los módulos compartidos: snake no
necesitó nada que no ofrecieran. Clave de storage `av_skin_snake`; snake no tenía clave antigua, así
que no hace falta el parámetro `legacyKey`.

**Notas de implementación:** `skinKey?` con default `'clasico'`, `skinRef` + efecto de
sincronización y una sola lectura `const skin = skinRef.current` al principio de `draw()`. El efecto
del game loop mantiene sus deps `[]`, así que cambiar de skin no reinicia la partida ni resetea
puntuación, nivel o longitud de la serpiente. Se añadió además un `redrawRef` (apuntado a `draw`
cuando `fruits.png` termina de cargar, y anulado en el cleanup) para repintar al vuelo: sin él, con
la partida en pausa o terminada no corre ningún `tick` y el cambio de skin no se vería hasta
reanudar.

**Verificación:** `npx tsc --noEmit` limpio. `npx eslint` sobre los dos archivos: `SnakeGame.tsx`
sin ningún aviso; `play/page.tsx` con los 2 errores `react-hooks/set-state-in-effect` de siempre
(lectura de `localStorage` en `useEffect` para skin y para nombre). Es el patrón canónico impuesto
para no romper la hidratación y es deuda preexistente del repo, no introducida aquí: se comprobó
que `app/games/tetris/play/page.tsx`, sin tocar, emite exactamente los mismos 2 errores en `:36` y
`:50`. La neutralidad de `clasico` se verificó a máquina comparando las cadenas generadas contra los
literales originales.

**Pendientes:** `arkanoid` (sin skins) y `tetris` (le falta `clasico`; además su skin `pastel` sigue
con `boardBg: '#f8f0ff'`, que incumple el criterio 1).

**Nota de fusión (rondas 02 y 03).** Las dos rondas se ejecutaron **en paralelo** sobre el mismo
working tree, con los ficheros repartidos por adelantado para que no colisionaran. Cada agente
escribió su informe por separado y no vio el resultado del otro: por eso la sección de la Ronda 03
lista `arkanoid` como pendiente y la de la Ronda 02 lista `snake`. Ambos quedaron **Completos** en
esta tanda. El único pendiente real tras la fusión es `tetris`, al que le falta `clasico` y que
arrastra el `boardBg: '#f8f0ff'` de su skin `pastel`, incumpliendo el criterio 1.
