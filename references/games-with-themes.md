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
| `asteroids` | Sin skins | —       | —     | —    | —                 | Literales en `draw()` | —     |
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
