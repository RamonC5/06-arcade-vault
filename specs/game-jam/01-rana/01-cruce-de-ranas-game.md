# SPEC — Integración del juego CRUCE DE RANAS

> **Estado:** Borrador
> **Depende de:** 06-games-table-leaderboard-supabase
> **Fecha:** 2026-08-17
> **Objetivo:** Integrar CRUCE DE RANAS como juego jugable en Arcade Vault, construyendo desde
> cero un canvas de esquiva por carriles (carretera y río) dibujado solo con primitivas y
> conectando el leaderboard de Supabase.

---

## Scope

**In:**

- INSERT SQL para añadir la fila `cruce-de-ranas` a la tabla `games` en Supabase (seed manual).
- Crear `components/games/CruceDeRanasGame.tsx` — componente React `"use client"` que encapsula
  el canvas (800 × 800 px) y el game loop completo. Acepta props:
  `paused`, `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`.
- El game loop se construye desde cero (no hay carpeta previa en `references/started-games/`):
  rejilla de 16 filas × 16 columnas de 50 px, salto discreto de la rana casilla a casilla,
  carriles de vehículos con velocidad y sentido alternos, carriles de río con troncos que
  arrastran a la rana, orilla superior con 5 nichos y temporizador por travesía.
- Todo el arte se dibuja con primitivas de canvas (`fillRect`, `arc`, `moveTo/lineTo`) usando
  la paleta del sistema de diseño: `--green` para la rana, `--cyan` para el agua, `--magenta`
  y `--yellow` para los vehículos, `--ink` para el asfalto y las marcas de carril.
- El HUD interno del canvas (score arriba izquierda, nivel arriba centro, vidas como iconos de
  rana arriba derecha, barra de tiempo en la banda inferior, nichos ocupados en la orilla) se
  dibuja dentro del canvas — patrón doble HUD igual que Asteroids, Tetris, Arkanoid y Snake.
- El componente notifica a React de cada cambio de estado vía callbacks (comparando con el
  valor anterior antes de disparar).
- La condición de game over es agotar las 3 vidas; la última muerte dispara `onLivesChange(0)`
  y a continuación `onGameOver(finalScore)`.
- El prop `paused: boolean` congela el loop (no ejecuta `update()`, tampoco descuenta el
  temporizador) pero sigue llamando a `draw()`.
- Limpiar el event listener de teclado (`keydown` en `document`) y cancelar el
  `requestAnimationFrame` en el `return` del `useEffect`.
- Crear `app/games/cruce-de-ranas/play/page.tsx` — play-page específica para este juego.
  Gestiona el estado (`score`, `lives`, `level`, `paused`, `over`, `name`, `saved`, `gameKey`)
  y pasa los callbacks al componente canvas.
- Wiring del modal de game over: pre-rellenar el nombre desde
  `localStorage.getItem('av_player_name')`; al confirmar, guardar el nombre en `localStorage`
  e insertar el score en la tabla `scores` vía cliente browser.
- El botón "PAUSA" de la plataforma pasa el flag `paused` al componente canvas; el botón
  "JUGAR DE NUEVO" reinicia incrementando `gameKey`.
- No se dibuja ningún overlay "GAME OVER" dentro del canvas — el modal React lo reemplaza.

**Fuera de alcance:**

- Crear las tablas `games` o `scores` en Supabase — ya existen (spec 06).
- Supabase Auth — `user_id` se almacena como `null` en todos los scores.
- RLS (Row Level Security) — se configura en un spec futuro de seguridad.
- Realtime — el leaderboard no se actualiza en vivo; solo al cargar la página.
- Paginación del leaderboard — se muestran los top 10 fijos.
- Controles táctiles o mobile.
- Actualización automática de `best` y `plays` en la tabla `games` — campos estáticos.
- Tortugas sumergibles en los carriles de río — la dificultad escala solo con velocidad,
  densidad y longitud de tronco.
- Extras clásicos del género (mosca bonus en un nicho, rana rescatable, cocodrilos).
- Sprites o imágenes externas — el juego se dibuja íntegramente con primitivas.
- Sonido y música.

---

## Data model

### Seed en Supabase — tabla `games`

Ejecutar en el SQL Editor de Supabase:

```sql
INSERT INTO games (id, title, short, long, cat, cover, color)
VALUES (
  'cruce-de-ranas',
  'CRUCE DE RANAS',
  'Cruza la autopista y el río sin morir.',
  'Guía a la rana casilla a casilla a través de cinco carriles de tráfico y cinco carriles de río hasta los nichos de la orilla. Los coches atropellan, el agua ahoga y los troncos te arrastran fuera de la pantalla. Ocupa los cinco nichos antes de que se agote el tiempo para subir de nivel.',
  'ARCADE',
  'cover-rana',
  'green'
);
```

### Props del componente `CruceDeRanasGame`

```ts
interface CruceDeRanasGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}
```

No se introducen nuevas tablas ni tipos TypeScript — se reutilizan `GameRow` y `ScoreRow`
de `lib/supabase/types.ts`.

### Estado interno del canvas

```ts
// Rejilla: CELL = 50, COLS = 16, ROWS = 16 → canvas 800 × 800
const state = {
  score: 0,
  lives: 3, // arranca en 3
  level: 1,
  timeLeft: 30, // segundos por travesía
  maxRowReached: 13, // fila más alta alcanzada en la vida actual
  frog: { x: 375, row: 13, hopAnim: 0 }, // x continuo en px, row discreta
  lanes: [
    /* { row, kind: 'road' | 'river', dir: 1 | -1, speed, items: Rect[] } */
  ],
  nests: [false, false, false, false, false], // nichos ocupados
};
```

Convenciones:

- Origen del canvas arriba a la izquierda; `row` 0 es la fila superior.
- `frog.x` es continuo en px (los troncos lo arrastran); `frog.row` es discreta y solo cambia
  con un salto.
- Velocidades de carril en px/segundo, escaladas por el nivel con un delta de tiempo.
- Hitbox de la rana: cuadrado de 36 × 36 px centrado en su casilla.

### Mapa de filas (16 filas de 50 px)

| Filas | Contenido                                                                   |
| ----- | --------------------------------------------------------------------------- |
| 0     | Banda de HUD interno: score, nivel, vidas                                   |
| 1     | Orilla con 5 nichos de 90 px centrados en x = 75, 225, 375, 525, 675        |
| 2–6   | Río: 5 carriles de troncos, sentidos alternos                                |
| 7     | Mediana segura                                                               |
| 8–12  | Carretera: 5 carriles de vehículos, sentidos alternos                        |
| 13    | Acera de salida; la rana reaparece en x = 375                                |
| 14–15 | Banda inferior: barra de tiempo y contador de nichos ocupados                |

### Puntuación

| Evento                                          | Puntos                       |
| ----------------------------------------------- | ---------------------------- |
| Avanzar por primera vez a una fila más alta      | +10                          |
| Llegar a un nicho libre                          | +50                          |
| Bonus de tiempo al ocupar un nicho               | +5 por segundo restante      |
| Completar los 5 nichos (fin de nivel)            | +1000                        |

---

## Implementation plan

1. **INSERT en Supabase** — ejecutar el SQL del data model en el SQL Editor de Supabase.
   Verificación: la fila `cruce-de-ranas` aparece en el Table Editor; `/games` muestra la card
   de CRUCE DE RANAS con cover `cover-rana` y color `green`, y `/games/cruce-de-ranas` carga
   con el leaderboard vacío.

2. **Crear `components/games/CruceDeRanasGame.tsx`** — componente `"use client"` que:
   - Renderiza un `<canvas width={800} height={800}>` estirado con `width/height: 100%`.
   - Construye los 10 carriles al montar y al subir de nivel: 5 de tipo `road` (filas 8–12) con
     2–4 vehículos de 60–110 px cada uno y 5 de tipo `river` (filas 2–6) con 2–3 troncos de
     100–200 px; los sentidos alternan carril a carril.
   - Game loop con `requestAnimationFrame` y delta de tiempo:
     - `update(dt)` desplaza los items de cada carril (reapareciendo por el lado opuesto al
       salir), descuenta `timeLeft`, arrastra la rana si está sobre un tronco, y evalúa muertes.
     - `draw()` limpia el canvas y pinta bandas de terreno, carriles, items, nichos, la rana
       (con squash de salto) y el HUD interno.
   - Salto discreto: `keydown` con ↑ ↓ ← → y WASD mueve la rana exactamente una casilla
     (50 px en x, una `row` en y); el salto se ignora si `hopAnim > 0` o si saldría del canvas.
     `hopAnim` (120 ms) solo afecta al dibujado.
   - Muertes: atropello (AABB rana-vehículo en fila `road`), ahogo (fila `river` sin tronco
     debajo), arrastre fuera del canvas sobre un tronco, aterrizaje en la orilla fuera de un
     nicho o en un nicho ya ocupado, y `timeLeft` a 0.
     Cada muerte resta 1 vida, dispara `onLivesChange(lives)`, reinicia la rana en la fila 13
     con `timeLeft = 30` y `maxRowReached = 13`.
   - Puntuación según la tabla del data model; `onScoreChange` se dispara solo cuando el valor
     cambia (comparando con el valor anterior).
   - Fin de nivel: al ocupar el quinto nicho, `level` sube 1, `onLevelChange(level)`, los nichos
     se vacían, `timeLeft` vuelve a 30 y las velocidades de carril se multiplican por
     `1 + 0.12 * (level - 1)`, añadiendo un vehículo extra a dos carriles y acortando un
     segmento los troncos (mínimo 100 px).
   - Al agotarse la última vida: `onLivesChange(0)` y luego `onGameOver(score)`; el loop se
     detiene y el canvas queda con el último frame dibujado, sin overlay propio.
   - Prop `paused: boolean` — si es `true`, el loop omite `update()` pero ejecuta `draw()`.
   - Limpia el listener de `keydown` y cancela el frame pendiente en el `return` del `useEffect`.
     Verificación: el juego arranca en `/games/cruce-de-ranas/play` y es jugable con las flechas
     o WASD; los troncos arrastran, los coches matan y los nichos se marcan al ocuparse.

3. **Crear `app/games/cruce-de-ranas/play/page.tsx`** — play-page específica:
   - Importa `CruceDeRanasGame` con `dynamic(..., { ssr: false })`.
   - Estado local: `score`, `lives` (inicial `3`), `level`, `paused`, `over`, `name`, `saved`,
     `gameKey`.
   - Pasa `paused` y los cuatro callbacks al componente; `key={gameKey}` fuerza el reinicio.
   - Reutiliza el layout visual de la plataforma (HUD React + `.crt` + modal `.modal` de game
     over), igual que las play-pages de Asteroids, Tetris, Arkanoid y Snake.
   - Modal game over: pre-rellena el nombre desde `localStorage.getItem('av_player_name')`;
     al confirmar, persiste el nombre en `av_player_name` e inserta en `scores`
     `{ game_id: 'cruce-de-ranas', player_name: name, score, user_id: null }` con el cliente
     browser de `lib/supabase/client.ts`.
   - `saved: true` deshabilita el botón de guardar para evitar doble inserción.
     Verificación: el HUD React refleja score, vidas y nivel en tiempo real; tras una partida el
     score aparece en `/games/cruce-de-ranas` y en `/hall-of-fame` al recargar.

4. **Verificación final** — `npm run build` termina sin errores de TypeScript ni de ESLint.
   Ninguna ruta existente devuelve 500.

---

## Acceptance criteria

- [ ] La fila `cruce-de-ranas` existe en la tabla `games` de Supabase con los valores del data model.
- [ ] La card de CRUCE DE RANAS aparece en `/games` con cover `cover-rana` y color `green`.
- [ ] El filtro por categoría `ARCADE` de `/games` incluye el juego.
- [ ] `/games/cruce-de-ranas` carga con los datos reales del juego y el leaderboard top 10.
- [ ] `/games/cruce-de-ranas/play` carga sin errores de SSR ni de TypeScript.
- [ ] El canvas de 800 × 800 se renderiza con la rejilla de 16 × 16 celdas de 50 px.
- [ ] La rana salta exactamente una casilla por pulsación con ↑ ↓ ← → y con WASD.
- [ ] La rana no puede salir de los límites del canvas mediante un salto.
- [ ] Los 5 carriles de carretera mueven vehículos con sentidos alternos y velocidades distintas.
- [ ] Chocar con un vehículo resta una vida y reinicia la rana en la fila de salida.
- [ ] Caer en una fila de río sin tronco debajo resta una vida.
- [ ] Estando sobre un tronco, la rana se desplaza con él.
- [ ] Ser arrastrado fuera del canvas sobre un tronco resta una vida.
- [ ] Aterrizar en la orilla fuera de un nicho, o en un nicho ocupado, resta una vida.
- [ ] Ocupar un nicho libre suma 50 puntos más 5 por segundo restante y lo marca como ocupado.
- [ ] Avanzar a una fila más alta por primera vez en la vida actual suma 10 puntos.
- [ ] Agotar el temporizador de 30 s resta una vida y reinicia la travesía.
- [ ] Completar los 5 nichos suma 1000 puntos, sube el nivel y acelera los carriles.
- [ ] El HUD interno del canvas muestra score, nivel, vidas, barra de tiempo y nichos ocupados.
- [ ] El HUD React de la plataforma refleja en tiempo real score, vidas y nivel.
- [ ] El botón "PAUSA" congela el game loop y el temporizador; "REANUDAR" los reanuda.
- [ ] Al perder la tercera vida se disparan `onLivesChange(0)` y `onGameOver(score)`.
- [ ] Aparece el modal React de game over con la puntuación final.
- [ ] El canvas no dibuja ningún overlay "GAME OVER" propio.
- [ ] El botón "JUGAR DE NUEVO" reinicia la partida desde cero (score 0, 3 vidas, nivel 1).
- [ ] Al abrir el modal, el campo de nombre se pre-rellena con `av_player_name` si existe.
- [ ] Al confirmar, el score se inserta en Supabase y el nombre se persiste en `localStorage`.
- [ ] El botón "GUARDAR PUNTUACIÓN" se deshabilita tras el primer envío (sin doble inserción).
- [ ] El score guardado aparece en `/games/cruce-de-ranas` y en `/hall-of-fame` al recargar.
- [ ] Cuando no hay scores, el leaderboard muestra "Sé el primero en entrar al salón de la fama".
- [ ] `/hall-of-fame` muestra un tab para CRUCE DE RANAS.
- [ ] Al desmontar la página no quedan listeners de `keydown` ni frames pendientes.
- [ ] `npm run build` completa sin errores de TypeScript.
- [ ] Ninguna ruta existente devuelve 500.

---

## Decisions

- **Sí: Esquiva por carriles como interpretación del tema "rana"** — la rana se juega como lo
  que hace una rana: saltar de un punto seguro a otro atravesando un medio hostil. La rejilla de
  carriles con carretera y río es la lectura más directa y reconocible del tema, y aporta a la
  plataforma un loop de esquiva por carriles con salto discreto que no comparte ningún juego
  actual del catálogo.

- **Sí: Salto discreto sobre rejilla, no movimiento continuo** — cada pulsación mueve una casilla
  exacta. Razón: es la fuente de la tensión del juego (cada salto es un compromiso irreversible)
  y hace las colisiones legibles y justas.

- **Sí: `frog.x` continuo con `row` discreta** — el eje vertical se mueve por casillas y el
  horizontal admite píxeles porque los troncos arrastran. Razón: sin x continuo el arrastre se
  vería a saltos y las colisiones con vehículos serían poco precisas.

- **Sí: Temporizador de 30 s por travesía** — agotarlo cuesta una vida. Razón: impide la
  estrategia de esperar indefinidamente en la mediana; obliga a arriesgar.

- **Sí: 3 vidas** — igual que Arkanoid y Asteroids. Razón: coherencia con el HUD estándar de la
  plataforma y con el género.

- **Sí: Nivel por travesías completas (5 nichos)** — el nivel sube al llenar la orilla y escala
  velocidad, densidad de vehículos y longitud de troncos. Razón: progresión medible que el
  jugador entiende sin explicación.

- **Sí: Arte con primitivas de canvas** — sin sprites ni imágenes externas. Razón: el juego cabe
  entero en rectángulos y círculos, y así no hay assets nuevos que copiar a `public/`.

- **Sí: Reutilizar la clase `.cover-rana` de `app/globals.css`** — carriles horizontales cian
  sobre fondo azulado con un círculo verde centrado. Razón: el arte ya está dibujado y describe
  literalmente esta mecánica; no hace falta arte nuevo.

- **Sí: Doble HUD** — el canvas conserva su HUD interno y React muestra los mismos valores en el
  HUD de la plataforma. Razón: coherencia con Asteroids, Tetris, Arkanoid y Snake; el canvas
  funciona visualmente como standalone.

- **Sí: Callbacks como interfaz de comunicación** — el componente llama `onScoreChange`,
  `onLivesChange`, `onLevelChange` y `onGameOver` cuando el estado cambia. Razón: desacoplamiento
  limpio; el juego no sabe nada de React ni de la plataforma.

- **Sí: `dynamic(..., { ssr: false })`** — el componente canvas se carga solo en cliente.
  Razón: `canvas` y `requestAnimationFrame` no existen en el entorno Node.js de Next.js SSR.

- **Sí: Play-page específica `app/games/cruce-de-ranas/play/page.tsx`** — en lugar de modificar
  la ruta genérica `[id]/play`. Razón: evita condicionales en la ruta genérica; Next.js App
  Router da prioridad a rutas estáticas sobre dinámicas.

- **Sí: Un único spec combinado (juego + leaderboard)** — las tablas `games` y `scores` ya
  existen; solo se añade la fila del juego y el wiring. Separarlos no aportaría valor visible.

- **No: Tortugas sumergibles en el río** — todos los items de río son troncos sólidos.
  Razón: la dificultad ya escala con velocidad, densidad y longitud; se puede añadir en un spec
  futuro sin tocar el modelo.

- **No: Mosca bonus ni rana rescatable** — sin extras de puntuación en la orilla.
  Razón: el bonus de tiempo ya premia la travesía rápida; añadir más eventos diluye el foco.

- **No: Crear tablas nuevas por juego** — se reutilizan `games` y `scores` del spec 06.
  Razón: el modelo es suficientemente genérico para cualquier juego con score numérico.

- **No: RLS en este spec** — las tablas quedan abiertas (INSERT y SELECT públicos).
  Razón: se mitiga en el spec futuro de seguridad.

- **No: Realtime en leaderboards** — los scores se ven al recargar.
  Razón: la complejidad de subscriptions no aporta valor mientras haya pocos jugadores activos.

- **No: Componente genérico `CanvasGame`** — cada juego tiene su componente propio.
  Razón: YAGNI; generalizar ahora sería abstraer sin caso de uso suficientemente confirmado.

---

## Qué **no** entra en este spec

- Tortugas sumergibles, cocodrilos y otros hazards de río.
- Mosca bonus, rana rescatable y multiplicadores especiales de la orilla.
- Controles táctiles o mobile.
- Sprites, sonido y música.
- Auth real, RLS y realtime en el leaderboard.

Cada uno de ellos, si llega, va en su propio spec.
