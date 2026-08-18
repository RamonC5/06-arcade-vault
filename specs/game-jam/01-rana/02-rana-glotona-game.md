# SPEC — Integración del juego RANA GLOTONA

> **Estado:** Borrador
> **Depende de:** 06-games-table-leaderboard-supabase
> **Fecha:** 2026-08-17
> **Objetivo:** Integrar RANA GLOTONA como juego jugable en Arcade Vault, construyendo desde
> cero un canvas de puntería con lengua extensible contra enjambres de insectos y conectando el
> leaderboard de Supabase.

---

## Scope

**In:**

- INSERT SQL para añadir la fila `rana-glotona` a la tabla `games` en Supabase (seed manual).
- Crear `components/games/RanaGlotonaGame.tsx` — componente React `"use client"` que encapsula
  el canvas (800 × 600 px) y el game loop completo. Acepta props:
  `paused`, `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`.
- El game loop se construye desde cero (no hay carpeta previa en `references/started-games/`):
  rana anclada en un nenúfar en la parte inferior central, mira giratoria, lengua que se
  extiende y retrae en línea recta, insectos con patrones de vuelo distintos, avispas como
  peligro, combos por lametón y barra de hambre que drena con el tiempo.
- Todo el arte se dibuja con primitivas de canvas (`fillRect`, `arc`, `quadraticCurveTo`,
  `moveTo/lineTo`) usando la paleta del sistema de diseño: `--green` para la rana y el nenúfar,
  `--magenta` para la lengua, `--cyan` y `--yellow` para los insectos, `--ink` para las guías.
- El HUD interno del canvas (score arriba izquierda, nivel arriba centro, vidas como iconos de
  rana arriba derecha, barra de hambre en la banda inferior, multiplicador de combo junto a la
  rana) se dibuja dentro del canvas — patrón doble HUD igual que Asteroids, Tetris, Arkanoid
  y Snake.
- El componente notifica a React de cada cambio de estado vía callbacks (comparando con el
  valor anterior antes de disparar).
- La condición de game over es agotar las 3 vidas, ya sea por picadura de avispa o por vaciar la
  barra de hambre; la última pérdida dispara `onLivesChange(0)` y luego `onGameOver(finalScore)`.
- El prop `paused: boolean` congela el loop (no ejecuta `update()`, tampoco drena el hambre)
  pero sigue llamando a `draw()`.
- Limpiar los event listeners de teclado (`keydown` y `keyup` en `document`) y cancelar el
  `requestAnimationFrame` en el `return` del `useEffect`.
- Crear `app/games/rana-glotona/play/page.tsx` — play-page específica para este juego.
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
- Movimiento lateral de la rana entre nenúfares — la rana está anclada y solo apunta.
- Power-ups (lengua doble, tiempo lento, escudo antiavispas) y jefes de nivel.
- Sprites o imágenes externas — el juego se dibuja íntegramente con primitivas.
- Sonido y música.

---

## Data model

### Seed en Supabase — tabla `games`

Ejecutar en el SQL Editor de Supabase:

```sql
INSERT INTO games (id, title, short, long, cat, cover, color)
VALUES (
  'rana-glotona',
  'RANA GLOTONA',
  'Apunta la lengua y cázalos a todos.',
  'Eres una rana anclada en su nenúfar con una lengua de puntería milimétrica. Gira la mira, dispara la lengua y engancha varios insectos de un solo lametón para multiplicar la puntuación. Cuidado con las avispas: lamer una cuesta una vida, y si la barra de hambre se vacía también.',
  'SHOOTER',
  'cover-glot',
  'yellow'
);
```

### Props del componente `RanaGlotonaGame`

```ts
interface RanaGlotonaGameProps {
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
// Canvas 800 × 600; rana anclada en (400, 545)
const state = {
  score: 0,
  lives: 3, // arranca en 3
  level: 1,
  eaten: 0, // insectos comidos en total
  hunger: 100, // 0–100; drena con el tiempo
  aim: -Math.PI / 2, // ángulo de la mira, en radianes
  tongue: { phase: 'idle', len: 0, stuck: [] }, // 'idle' | 'out' | 'back' | 'stunned'
  bugs: [
    /* { type: 'mosca' | 'libelula' | 'luciernaga' | 'avispa', x, y, vx, vy, t } */
  ],
};
```

Convenciones:

- Origen del canvas arriba a la izquierda; el ángulo `aim` se mide desde el eje X positivo y se
  limita a `[-160°, -20°]` (es decir, la lengua siempre apunta hacia arriba).
- Velocidades en px/segundo, integradas con un delta de tiempo.
- La punta de la lengua es un círculo de radio 9 px; cada insecto es un círculo de radio 10–16
  px según el tipo. La colisión es distancia entre centros.

### Tipos de insecto

| Tipo        | Puntos | Radio | Patrón de vuelo                                  | Frecuencia   |
| ----------- | ------ | ----- | ------------------------------------------------ | ------------ |
| Mosca       | 10     | 10    | Horizontal con jitter vertical aleatorio          | Muy común    |
| Libélula    | 25     | 14    | Recta y rápida en la mitad superior               | Común        |
| Luciérnaga  | 50     | 12    | Senoidal lenta con halo brillante                 | Rara         |
| Avispa      | —      | 13    | Zigzag diagonal descendente hacia el nenúfar      | Escala nivel |

### Reglas de puntuación y estado

| Evento                                             | Efecto                                          |
| -------------------------------------------------- | ----------------------------------------------- |
| Insecto enganchado y tragado                        | + puntos del tipo × multiplicador del lametón   |
| 2, 3, 4+ insectos en un mismo lametón               | Multiplicador × 2, × 3, × 4                     |
| Cada insecto tragado                                | `hunger += 12` (máximo 100), `eaten += 1`       |
| Lametón sin capturas                                | `hunger -= 4` (coste de fallo)                  |
| Lamer una avispa                                    | −1 vida, lengua en `stunned` 1 s, combo a 0     |
| `hunger` llega a 0                                  | −1 vida, `hunger` vuelve a 60                   |
| Cada 10 insectos comidos                            | `level += 1`                                    |

Cada nivel multiplica la velocidad de los insectos por `1 + 0.1 * (level - 1)`, reduce el
intervalo de spawn un 8 % (mínimo 250 ms), aumenta la proporción de avispas un 4 % (máximo 35 %)
y acelera el drenaje de hambre de 4 a `4 + 0.6 * (level - 1)` puntos por segundo.

---

## Implementation plan

1. **INSERT en Supabase** — ejecutar el SQL del data model en el SQL Editor de Supabase.
   Verificación: la fila `rana-glotona` aparece en el Table Editor; `/games` muestra la card de
   RANA GLOTONA con cover `cover-glot` y color `yellow`, y `/games/rana-glotona` carga con el
   leaderboard vacío.

2. **Crear `components/games/RanaGlotonaGame.tsx`** — componente `"use client"` que:
   - Renderiza un `<canvas width={800} height={600}>` estirado con `width/height: 100%`.
   - Dibuja el estanque de fondo, el nenúfar y la rana anclada en (400, 545), con una guía
     punteada corta que indica el ángulo de la mira.
   - Game loop con `requestAnimationFrame` y delta de tiempo:
     - `update(dt)` gira la mira según las teclas mantenidas, avanza la fase de la lengua,
       mueve los insectos, resuelve colisiones, drena el hambre y gestiona spawns.
     - `draw()` limpia el canvas y pinta fondo, insectos, lengua (curva desde la boca hasta la
       punta con los insectos enganchados), rana y HUD interno.
   - Controles: ← y → giran la mira a 2.2 rad/s mientras se mantienen pulsadas (con clamp del
     ángulo); Espacio dispara la lengua si `phase === 'idle'`; mientras Espacio siga pulsado la
     lengua se extiende a 900 px/s hasta `maxLen = 520 px`; al soltar la tecla o al alcanzar
     `maxLen` pasa a `back` y se retrae a 1100 px/s.
   - Enganche: en fase `out`, cualquier insecto no-avispa cuyo centro esté a menos de
     `radio + 9` px de la punta se marca `stuck` y viaja con la lengua; al completar la retracción
     todos los `stuck` se traga (suma de puntos con el multiplicador correspondiente al número de
     capturas de ese lametón) y la lengua vuelve a `idle`.
   - Avispas: si la punta toca una avispa en fase `out`, la lengua pasa a `stunned` 1 s, se
     pierden los `stuck` de ese lametón, se resta una vida y se dispara `onLivesChange(lives)`.
   - Hambre: drena de forma continua; al llegar a 0 resta una vida, dispara `onLivesChange(lives)`
     y la barra vuelve a 60.
   - Spawner: cada `spawnInterval` (1200 ms en nivel 1) genera un insecto en un borde lateral con
     el tipo elegido por pesos de la tabla; los insectos que salen del canvas se eliminan sin
     penalización.
   - Nivel: cada 10 insectos comidos sube `level`, dispara `onLevelChange(level)` y aplica los
     escalados descritos en el data model.
   - `onScoreChange` se dispara solo cuando el score cambia (comparando con el valor anterior).
   - Al agotarse la última vida: `onLivesChange(0)` y luego `onGameOver(score)`; el loop se
     detiene y el canvas queda con el último frame dibujado, sin overlay propio.
   - Prop `paused: boolean` — si es `true`, el loop omite `update()` pero ejecuta `draw()`.
   - Limpia los listeners de `keydown` y `keyup` y cancela el frame pendiente en el `return`
     del `useEffect`.
     Verificación: el juego arranca en `/games/rana-glotona/play`, la mira gira con ← →, la
     lengua se extiende manteniendo Espacio y engancha varios insectos de un lametón.

3. **Crear `app/games/rana-glotona/play/page.tsx`** — play-page específica:
   - Importa `RanaGlotonaGame` con `dynamic(..., { ssr: false })`.
   - Estado local: `score`, `lives` (inicial `3`), `level`, `paused`, `over`, `name`, `saved`,
     `gameKey`.
   - Pasa `paused` y los cuatro callbacks al componente; `key={gameKey}` fuerza el reinicio.
   - Reutiliza el layout visual de la plataforma (HUD React + `.crt` + modal `.modal` de game
     over), igual que las play-pages de Asteroids, Tetris, Arkanoid y Snake.
   - Modal game over: pre-rellena el nombre desde `localStorage.getItem('av_player_name')`;
     al confirmar, persiste el nombre en `av_player_name` e inserta en `scores`
     `{ game_id: 'rana-glotona', player_name: name, score, user_id: null }` con el cliente
     browser de `lib/supabase/client.ts`.
   - `saved: true` deshabilita el botón de guardar para evitar doble inserción.
     Verificación: el HUD React refleja score, vidas y nivel en tiempo real; tras una partida el
     score aparece en `/games/rana-glotona` y en `/hall-of-fame` al recargar.

4. **Verificación final** — `npm run build` termina sin errores de TypeScript ni de ESLint.
   Ninguna ruta existente devuelve 500.

---

## Acceptance criteria

- [ ] La fila `rana-glotona` existe en la tabla `games` de Supabase con los valores del data model.
- [ ] La card de RANA GLOTONA aparece en `/games` con cover `cover-glot` y color `yellow`.
- [ ] El filtro por categoría `SHOOTER` de `/games` incluye el juego.
- [ ] `/games/rana-glotona` carga con los datos reales del juego y el leaderboard top 10.
- [ ] `/games/rana-glotona/play` carga sin errores de SSR ni de TypeScript.
- [ ] El canvas de 800 × 600 se renderiza con el estanque, el nenúfar y la rana anclada.
- [ ] Las teclas ← y → giran la mira de forma continua mientras se mantienen pulsadas.
- [ ] El ángulo de la mira está limitado y la lengua nunca apunta hacia abajo.
- [ ] Espacio dispara la lengua solo cuando está en reposo (sin encadenar disparos superpuestos).
- [ ] Mantener Espacio extiende la lengua hasta el máximo de 520 px; al soltar, se retrae.
- [ ] Los insectos enganchados viajan con la lengua y se contabilizan al terminar la retracción.
- [ ] Enganchar 2, 3 o 4+ insectos en un mismo lametón aplica multiplicador × 2, × 3, × 4.
- [ ] Cada tipo de insecto suma sus puntos (mosca 10, libélula 25, luciérnaga 50).
- [ ] Los cuatro tipos de insecto aparecen con patrones de vuelo visiblemente distintos.
- [ ] Lamer una avispa resta una vida, aturde la lengua 1 s y descarta las capturas del lametón.
- [ ] La barra de hambre drena con el tiempo y se rellena al tragar insectos.
- [ ] Vaciar la barra de hambre resta una vida y la reinicia al 60 %.
- [ ] Un lametón sin capturas descuenta hambre.
- [ ] Cada 10 insectos comidos sube el nivel y acelera insectos, spawns y drenaje.
- [ ] El HUD interno del canvas muestra score, nivel, vidas, barra de hambre y multiplicador.
- [ ] El HUD React de la plataforma refleja en tiempo real score, vidas y nivel.
- [ ] El botón "PAUSA" congela el game loop y el drenaje de hambre; "REANUDAR" los reanuda.
- [ ] Al perder la tercera vida se disparan `onLivesChange(0)` y `onGameOver(score)`.
- [ ] Aparece el modal React de game over con la puntuación final.
- [ ] El canvas no dibuja ningún overlay "GAME OVER" propio.
- [ ] El botón "JUGAR DE NUEVO" reinicia la partida desde cero (score 0, 3 vidas, nivel 1).
- [ ] Al abrir el modal, el campo de nombre se pre-rellena con `av_player_name` si existe.
- [ ] Al confirmar, el score se inserta en Supabase y el nombre se persiste en `localStorage`.
- [ ] El botón "GUARDAR PUNTUACIÓN" se deshabilita tras el primer envío (sin doble inserción).
- [ ] El score guardado aparece en `/games/rana-glotona` y en `/hall-of-fame` al recargar.
- [ ] Cuando no hay scores, el leaderboard muestra "Sé el primero en entrar al salón de la fama".
- [ ] `/hall-of-fame` muestra un tab para RANA GLOTONA.
- [ ] Al desmontar la página no quedan listeners de `keydown`/`keyup` ni frames pendientes.
- [ ] `npm run build` completa sin errores de TypeScript.
- [ ] Ninguna ruta existente devuelve 500.

---

## Decisions

- **Sí: Puntería con lengua extensible como interpretación del tema "rana"** — el rasgo más
  característico de una rana no es solo saltar, es cazar al vuelo con la lengua. Convertir esa
  lengua en un proyectil dirigible con alcance variable es una lectura fiel del tema y da un loop
  central de puntería y timing, con riesgo por sobreextenderse, que no depende de esquivar nada.

- **Sí: Categoría `SHOOTER`** — la lengua funciona como un proyectil apuntado con ángulo y
  alcance. Razón: el loop es de puntería y no de recorrido, así que el jugador que filtra por
  `SHOOTER` en `/games` encuentra exactamente lo que espera.

- **Sí: Rana anclada al nenúfar** — no hay movimiento lateral del jugador. Razón: concentra toda
  la habilidad en el ángulo, el momento del disparo y la duración de la extensión; añadir
  desplazamiento diluiría el foco y duplicaría los controles.

- **Sí: Extensión proporcional a la pulsación de Espacio** — soltar antes retrae antes.
  Razón: convierte cada lametón en una decisión de riesgo (más alcance = más tiempo expuesto a
  avispas y más tiempo sin poder disparar).

- **Sí: Combo por lametón, no por tiempo** — el multiplicador depende de cuántos insectos entran
  en un mismo lametón. Razón: premia leer los patrones de vuelo y esperar la alineación, que es
  la habilidad que el juego quiere entrenar.

- **Sí: Barra de hambre como reloj de presión** — drena siempre y se rellena comiendo; vaciarla
  cuesta una vida. Razón: impide jugar a la defensiva esperando el lametón perfecto, sin
  necesidad de un temporizador abstracto.

- **Sí: 3 vidas** — igual que Arkanoid y Asteroids. Razón: coherencia con el HUD estándar de la
  plataforma; la avispa y el hambre comparten el mismo contador.

- **Sí: Arte con primitivas de canvas** — sin sprites ni imágenes externas. Razón: insectos,
  lengua y nenúfar se resuelven con círculos, líneas y curvas; no hay assets nuevos que copiar
  a `public/`.

- **Sí: Reutilizar la clase `.cover-glot` de `app/globals.css`** — su arte es una boca abierta
  amarilla tragando puntos que se le acercan, que es literalmente lo que ocurre en este juego.
  Razón: no hace falta arte nuevo; si más adelante se quiere una portada propia, se añadirá una
  clase `.cover-lengua` en un spec de diseño aparte.

- **Sí: Doble HUD** — el canvas conserva su HUD interno y React muestra los mismos valores en el
  HUD de la plataforma. Razón: coherencia con Asteroids, Tetris, Arkanoid y Snake; el canvas
  funciona visualmente como standalone.

- **Sí: Callbacks como interfaz de comunicación** — el componente llama `onScoreChange`,
  `onLivesChange`, `onLevelChange` y `onGameOver` cuando el estado cambia. Razón: desacoplamiento
  limpio; el juego no sabe nada de React ni de la plataforma.

- **Sí: `dynamic(..., { ssr: false })`** — el componente canvas se carga solo en cliente.
  Razón: `canvas` y `requestAnimationFrame` no existen en el entorno Node.js de Next.js SSR.

- **Sí: Play-page específica `app/games/rana-glotona/play/page.tsx`** — en lugar de modificar la
  ruta genérica `[id]/play`. Razón: evita condicionales en la ruta genérica; Next.js App Router
  da prioridad a rutas estáticas sobre dinámicas.

- **Sí: Un único spec combinado (juego + leaderboard)** — las tablas `games` y `scores` ya
  existen; solo se añade la fila del juego y el wiring. Separarlos no aportaría valor visible.

- **No: Penalizar los insectos que escapan** — salir del canvas no resta nada.
  Razón: el drenaje de hambre ya castiga la inacción; una doble penalización haría el juego
  frustrante en niveles altos.

- **No: Power-ups ni jefes** — sin lengua doble, escudo ni enemigos especiales.
  Razón: el escalado por nivel ya aporta curva de dificultad; los power-ups son un spec futuro.

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

- Movimiento lateral de la rana entre nenúfares.
- Power-ups (lengua doble, tiempo lento, escudo antiavispas) y jefes de nivel.
- Controles táctiles o mobile.
- Sprites, sonido y música.
- Auth real, RLS y realtime en el leaderboard.

Cada uno de ellos, si llega, va en su propio spec.
