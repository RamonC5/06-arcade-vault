# SPEC 10 — Controles táctiles y modo móvil en las play-pages

> **Estado:** Aprobado
> **Depende de:** 05-asteroids-game, 07-tetris-game, 08-arkanoid-game, 09-snake-game
> **Fecha:** 2026-08-18
> **Objetivo:** Hacer jugables los cuatro juegos de canvas en un dispositivo táctil
> añadiendo una botonera en pantalla, un modo de pantalla completa y un layout vertical
> en sus play-pages.

---

## Por qué existe este spec

Los cuatro juegos escuchan exclusivamente `keydown` / `keyup` y Arkanoid mueve la pala con
`mousemove`. En un móvil no hay teclado ni puntero fino, así que las cuatro play-pages
cargan pero no se pueden jugar. Los specs 05, 07, 08 y 09 dejaron por escrito
"controles táctiles o mobile" como fuera de alcance; este spec es la deuda que dejaron.

La decisión de fondo es **no tocar los game loops**: cada juego expone una API imperativa
mínima y la botonera vive fuera del canvas, en React. Así los controles no interfieren con
el sistema de skins ni con el HUD interno que dibuja cada juego.

---

## Scope

**In:**

- Crear `lib/gameInput.ts` con los tipos compartidos `GameAction`, `GameInput`,
  `TouchMode`, `TouchButton`, `TouchLayout`, las constantes de repetición y el hook
  `useCoarsePointer()`.
- Crear `components/TouchControls.tsx` — botonera DOM que renderiza un `TouchLayout` y
  traduce cada pulsación a `press` / `release` sobre el `GameInput` del juego.
- Ampliar el contrato de los cuatro juegos con una prop opcional
  `inputRef?: RefObject<GameInput | null>`; el componente escribe su handle en
  `inputRef.current` dentro de su `useEffect` y lo pone a `null` al limpiar.
- En cada juego, extraer una función interna que compartan el handler de teclado y el
  handle imperativo, de modo que ambos caminos ataquen la misma primitiva de input.
- Declarar una constante `TOUCH_LAYOUT` en cada una de las cuatro play-pages y montar
  `<TouchControls>` bajo el CRT solo cuando `useCoarsePointer()` es `true`.
- Crear `lib/useFullscreen.ts` — hook con Fullscreen API nativa y fallback CSS para
  navegadores que no la soportan (Safari de iPhone).
- Añadir un botón `PANTALLA COMPLETA` a `.hud-actions` en las cuatro play-pages, y salir
  automáticamente del modo al abrir el modal de fin de partida.
- Sustituir el `aspect-ratio: 4 / 3` fijo de `.crt-screen` por
  `aspect-ratio: var(--crt-ratio, 4 / 3)`, y fijar `--crt-ratio` por juego.
- Hacer responsivos los dos canvas de Tetris y pasarlos a columna en puntero grueso.
- Añadir a `app/globals.css` los estilos de la botonera, del modo pantalla completa y una
  media query `@media (pointer: coarse) and (max-width: 720px)` con el layout vertical.
- Aplicar `touch-action: none` y `user-select: none` al CRT y a la botonera.
- Actualizar el contrato `GameProps` documentado en `CLAUDE.md` y crear el ledger
  `references/games-with-touch.md`.

**Fuera de alcance (para specs futuros):**

- Gestos de cualquier tipo: swipe para girar en Snake y arrastre de la pala en Arkanoid.
  La pala se mueve con los botones ◀ ▶; el `mousemove` actual se conserva intacto para
  escritorio.
- La play-page genérica `app/games/[id]/play/page.tsx` — es un simulador con contador
  aleatorio, sin canvas ni input real.
- Layout específico en orientación horizontal y aviso de "gira el dispositivo".
- Adaptación móvil del resto del sitio: `/games`, `/games/[id]`, `/hall-of-fame`,
  `/about`, `/auth` y la `Nav`.
- Bloqueo global del zoom (`export const viewport` con `userScalable: false`).
- Vibración / haptics al pulsar.
- Remapeo de botones por el usuario y soporte de mando físico (Gamepad API).
- Cualquier cambio de jugabilidad, dificultad o velocidad en móvil: se juega exactamente
  al mismo juego que en escritorio.
- Cambios en las skins o en el HUD que cada juego dibuja dentro de su canvas.
- PWA, instalación en pantalla de inicio y modo offline.

---

## Data model

### Tipos compartidos — `lib/gameInput.ts`

```ts
export type GameAction =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'fire'
  | 'rotate'
  | 'drop';

export interface GameInput {
  press(action: GameAction): void;
  release(action: GameAction): void;
}

export type TouchMode = 'hold' | 'tap' | 'repeat';

export interface TouchButton {
  action: GameAction;
  /** Glifo o texto corto. UI en español. */
  label: string;
  mode: TouchMode;
}

export interface TouchLayout {
  /** Bloque izquierdo: direcciones. */
  dpad: TouchButton[];
  /** Bloque derecho: acciones. Puede ir vacío. */
  actions: TouchButton[];
}

/** ms hasta la primera repetición de un botón `repeat`. */
export const REPEAT_DELAY = 250;
/** ms entre repeticiones sucesivas. */
export const REPEAT_RATE = 120;
```

`useCoarsePointer()` devuelve `false` en el primer render y el valor real de
`matchMedia('(pointer: coarse)')` tras montar, siguiendo el mismo patrón que
`getSavedSkin` en `lib/skins.ts`: nunca se lee en el inicializador de `useState`, para que
el primer render de cliente coincida con el HTML del servidor.

### Ampliación del contrato de los juegos

Los cuatro componentes de `components/games/` añaden una prop opcional:

```ts
inputRef?: React.RefObject<GameInput | null>;
```

Es opcional a propósito: un juego sin ella sigue compilando y funcionando con teclado.

### Semántica de los modos

| Modo     | `pointerdown`      | Mientras se mantiene                                            | `pointerup` / `pointercancel` |
| -------- | ------------------ | --------------------------------------------------------------- | ----------------------------- |
| `hold`   | `press`            | nada                                                              | `release`                     |
| `tap`    | `press` + `release`| nada                                                              | nada                          |
| `repeat` | `press` + `release`| `press` + `release` cada `REPEAT_RATE` ms tras `REPEAT_DELAY` ms  | para el temporizador          |

### Mapa de acciones por juego

| Juego     | Acción                             | Modo   | Primitiva interna actual                            |
| --------- | ---------------------------------- | ------ | --------------------------------------------------- |
| asteroids | `left`                             | hold   | `keys['ArrowLeft']`                                  |
| asteroids | `right`                            | hold   | `keys['ArrowRight']`                                 |
| asteroids | `up`                               | hold   | `keys['ArrowUp']` (empuje)                           |
| asteroids | `fire`                             | tap    | `justPressed['Space']`, leído por `pressed('Space')` |
| tetris    | `left` / `right`                   | repeat | ramas `ArrowLeft` / `ArrowRight` de `onKeyDown`      |
| tetris    | `down`                             | repeat | `softDrop()`                                         |
| tetris    | `rotate`                           | tap    | `tryRotate()`                                        |
| tetris    | `drop`                             | tap    | `hardDrop()`                                         |
| arkanoid  | `left` / `right`                   | hold   | `keys.ArrowLeft` / `keys.ArrowRight`                 |
| snake     | `up` / `down` / `left` / `right`   | tap    | `s.nextDir`, tras el filtro de giro de 180°          |

`release` es un no-op en Tetris y en Snake: todas sus acciones son discretas.

### Layouts declarados en las play-pages

```ts
// app/games/asteroids/play/page.tsx
const TOUCH_LAYOUT: TouchLayout = {
  dpad: [
    { action: 'left', label: '◀', mode: 'hold' },
    { action: 'right', label: '▶', mode: 'hold' },
  ],
  actions: [
    { action: 'up', label: 'IMPULSO', mode: 'hold' },
    { action: 'fire', label: 'FUEGO', mode: 'tap' },
  ],
};
```

| Juego     | `dpad`                             | `actions`               |
| --------- | ---------------------------------- | ----------------------- |
| asteroids | ◀ hold, ▶ hold                     | IMPULSO hold, FUEGO tap |
| tetris    | ◀ repeat, ▼ repeat, ▶ repeat       | GIRAR tap, CAÍDA tap    |
| arkanoid  | ◀ hold, ▶ hold                     | —                       |
| snake     | ▲ tap, ◀ tap, ▼ tap, ▶ tap         | —                       |

### Relación de aspecto del CRT

`--crt-ratio` se fija con estilo inline en el contenedor `.crt` de cada play-page:

| Juego     | Escritorio             | Puntero grueso           |
| --------- | ---------------------- | ------------------------ |
| asteroids | `4 / 3`                | `4 / 3`                  |
| arkanoid  | `4 / 3`                | `4 / 3`                  |
| snake     | `1 / 1`                | `1 / 1`                  |
| tetris    | `3 / 4` (canvas en fila) | `1 / 2` (canvas en columna) |

No se crean tablas nuevas en Supabase, ni claves nuevas de `localStorage`: la detección es
automática y no se persiste ninguna preferencia.

---

## Implementation plan

1. **Crear `lib/gameInput.ts`** — los tipos, `REPEAT_DELAY`, `REPEAT_RATE` y el hook
   `useCoarsePointer()` (suscrito a `change` del `MediaQueryList` y desuscrito al
   desmontar). Verificación: `npm run build` compila; todavía no lo importa nadie.

2. **Crear `components/TouchControls.tsx`** — componente `"use client"` con props
   `layout: TouchLayout`, `inputRef: RefObject<GameInput | null>` y `disabled?: boolean`.
   Usa `onPointerDown` / `onPointerUp` / `onPointerCancel` con `setPointerCapture`, aplica
   la tabla de modos, y libera toda acción retenida cuando `disabled` pasa a `true` o el
   componente se desmonta. Verificación: `npm run build` compila.

3. **Estilos base en `app/globals.css`** — `.touch-controls`, `.touch-dpad`,
   `.touch-actions` y `.touch-btn` (mínimo 56 × 56 px, `touch-action: none`,
   `user-select: none`, estado `:active` visible), y cambiar la línea existente a
   `.crt-screen { aspect-ratio: var(--crt-ratio, 4 / 3); }`. Verificación: las cuatro
   play-pages se ven en escritorio exactamente igual que antes del cambio.

4. **Asteroids de extremo a extremo** — es el corte vertical que valida la arquitectura
   antes de replicarla. En `AsteroidsGame.tsx`, extraer `applyKey(code, down)` del cuerpo
   de `onKeyDown` / `onKeyUp` y publicar el handle en `inputRef`. En su play-page, declarar
   `TOUCH_LAYOUT`, crear el `inputRef` con `useRef`, pasarlo al juego, montar
   `<TouchControls>` bajo el CRT cuando `useCoarsePointer()` es `true` y fijar
   `--crt-ratio: 4 / 3`. Verificación: en la emulación móvil de DevTools la nave gira,
   impulsa y dispara usando solo la botonera.

5. **Arkanoid** — mismo patrón: `press('left')` pone `keys.ArrowLeft` a `true` y
   `release('left')` a `false`. El listener `mousemove` del canvas se conserva sin cambios.
   `--crt-ratio: 4 / 3`. Verificación: la pala se mueve con ◀ ▶ y sigue respondiendo al
   ratón en escritorio.

6. **Snake** — extraer `setDirection(dx, dy)` con el filtro de 180° ya existente, usarla
   desde el handler de teclado y desde el handle. D-pad de cuatro botones en modo `tap`.
   `--crt-ratio: 1 / 1`. Verificación: la serpiente responde a los cuatro botones y sigue
   ignorando el giro de 180°.

7. **Tetris** — extraer `doAction(code)` del `switch` de `onKeyDown` y llamarla desde
   ambos caminos. Hacer responsivos los dos canvas (el tablero deriva su ancho de la altura
   disponible manteniendo su proporción 1:2). En puntero grueso, el contenedor pasa a
   columna con la pieza siguiente encima del tablero y `--crt-ratio: 1 / 2`; en escritorio
   sigue en fila con `3 / 4`. Verificación: en 390 × 844 el tablero completo es visible sin
   recorte y las piezas se mueven, giran y caen con los botones.

8. **Crear `lib/useFullscreen.ts` y el botón** — el hook devuelve `{ ref, active, toggle }`,
   intenta `requestFullscreen()` sobre el elemento referenciado y, si el navegador no la
   soporta, activa la clase `.av-stage-fs` (`position: fixed; inset: 0`). Se sincroniza con
   el evento `fullscreenchange` para reflejar la salida con la tecla Escape. En las cuatro
   play-pages, envolver CRT + botonera en un `.av-stage` con esa `ref`, añadir el botón
   `PANTALLA COMPLETA` a `.hud-actions` y salir del modo dentro de `handleGameOver`.
   Verificación: el botón entra y sale de pantalla completa en Chrome de escritorio, y el
   modal de fin de partida siempre queda visible.

9. **Media query móvil** — `@media (pointer: coarse) and (max-width: 720px)`: HUD compacto
   en dos filas, `.btn` de `.hud-actions` con al menos 44 px de alto, y CRT dimensionado por
   altura (`height` acotada a la ventana, `width` derivada por `--crt-ratio`) para que HUD,
   CRT y botonera quepan sin scroll vertical. Verificación: en 390 × 844 no hay barra de
   scroll vertical en ninguna de las cuatro play-pages.

10. **Documentación y ledger** — en `CLAUDE.md`, añadir `inputRef` al bloque `GameProps` y
    una línea de convención sobre controles táctiles en la lista de convenciones de juegos;
    crear `references/games-with-touch.md` con una fila por juego indicando su layout.
    Verificación: los cuatro juegos aparecen en el ledger y el contrato de `CLAUDE.md`
    coincide con el código.

---

## Acceptance criteria

### Detección y no-regresión en escritorio

- [ ] En un navegador de escritorio con ratón, las cuatro play-pages se ven y se juegan
      exactamente igual que antes de este spec.
- [ ] La botonera táctil **no** se renderiza cuando `matchMedia('(pointer: coarse)')` es `false`.
- [ ] La botonera **sí** se renderiza en la emulación de dispositivo móvil de DevTools.
- [ ] No hay error de hidratación en consola al cargar cualquier play-page.

### Jugabilidad táctil

- [ ] En Asteroids, con solo la botonera, la nave gira a izquierda y derecha, impulsa y dispara.
- [ ] En Asteroids, mantener ◀ gira de forma continua; soltar el dedo detiene el giro.
- [ ] En Asteroids, un toque en FUEGO dispara exactamente una bala.
- [ ] En Tetris, mantener ◀ mueve la pieza más de una celda (auto-repetición).
- [ ] En Tetris, GIRAR rota la pieza y CAÍDA la baja de golpe.
- [ ] En Arkanoid, la pala se mueve mientras se mantiene ◀ o ▶ y se detiene al soltar.
- [ ] En Arkanoid, el control con ratón sigue funcionando en escritorio.
- [ ] En Snake, los cuatro botones cambian la dirección y el giro de 180° sigue ignorado.
- [ ] Pulsar PAUSA deja la botonera inactiva y libera cualquier acción retenida: al reanudar,
      la nave de Asteroids no sigue girando sola.
- [ ] Arrastrar el dedo fuera de un botón mantenido dispara su `release` (no queda pegado).

### Layout y pantalla completa

- [ ] En un viewport de 390 × 844, HUD, CRT y botonera caben sin scroll vertical en las
      cuatro play-pages.
- [ ] El canvas de Snake ocupa un CRT cuadrado, sin bandas laterales.
- [ ] El tablero de Tetris se ve completo, sin recorte, y la pieza siguiente aparece encima.
- [ ] Cada botón táctil mide al menos 56 × 56 px.
- [ ] Un doble toque rápido sobre un botón o sobre el canvas no hace zoom.
- [ ] El zoom con dos dedos sigue funcionando en el resto de la página.
- [ ] El botón PANTALLA COMPLETA maximiza CRT + botonera y su segunda pulsación lo revierte.
- [ ] Salir con la tecla Escape deja el botón en el estado correcto (no se queda en "activo").
- [ ] Donde la Fullscreen API no existe, el botón sigue funcionando mediante el fallback CSS.
- [ ] Al terminar la partida se sale de pantalla completa y el modal de fin de juego es visible.

### Cierre

- [ ] Guardar la puntuación desde el modal funciona igual en móvil que en escritorio.
- [ ] `CLAUDE.md` documenta `inputRef` en el contrato `GameProps`.
- [ ] `references/games-with-touch.md` existe y lista los cuatro juegos con su layout.
- [ ] `npm run build` completa sin errores de TypeScript.
- [ ] `npm run lint` no añade advertencias nuevas.

---

## Decisions

- **Sí: botonera DOM en pantalla, sin gestos.** Razón: es explícita y descubrible, funciona
  igual en los cuatro juegos y no compite con los gestos del navegador. El arrastre de pala
  y el swipe se pueden añadir después sobre esta base sin rehacer nada.

- **No: eventos de teclado sintéticos.** Habría evitado tocar los cuatro componentes, pero
  crea un acoplamiento invisible: cualquier juego futuro que escuche en su canvas en vez de
  en `document` fallaría en silencio. Razón para descartarlo: preferimos un contrato
  explícito y tipado.

- **Sí: prop `inputRef` mutable.** Razón: es una prop normal, así que atraviesa
  `next/dynamic` con `ssr: false` sin la capa extra de reenvío de refs que exigiría
  `forwardRef`; y al ser opcional no rompe a ningún consumidor existente.

- **No: `forwardRef` + `useImperativeHandle`.** Más idiomático, pero depende de que
  `next/dynamic` reenvíe la ref correctamente; el modo de fallo es silencioso.

- **Sí: una función interna compartida por teclado y táctil en cada juego** (`applyKey`,
  `doAction`, `setDirection`). Razón: garantiza que ambos caminos de entrada produzcan
  exactamente el mismo efecto, en lugar de duplicar la lógica.

- **Sí: detección automática por `(pointer: coarse)`.** Razón: cero UI extra y cero
  decisiones para el jugador. Se descartó el interruptor manual en el HUD por no añadir una
  preferencia persistida más antes de saber si hace falta.

- **No: umbral por ancho de viewport.** Una ventana estrecha de escritorio sacaría botones
  inútiles. El tipo de puntero es la señal correcta.

- **Sí: modo declarado por botón (`hold` / `tap` / `repeat`).** Razón: el mismo glifo ◀
  necesita comportamientos distintos en Asteroids (giro continuo) y en Tetris (movimiento
  discreto con repetición). Un modo único haría uno de los dos juegos peor.

- **Sí: `TOUCH_LAYOUT` en cada play-page.** Razón: sigue el patrón que ya existe con
  `SKIN_OPTIONS` y mantiene lo específico del juego junto al juego. Se descartó un registro
  central en `lib/` por separar la configuración de su único consumidor.

- **Sí: Fullscreen API nativa con fallback CSS.** Razón: Safari de iPhone no implementa
  `requestFullscreen` en elementos que no sean vídeo, y es una parte grande del tráfico
  móvil; un botón que a veces no está es peor que un fallback uniforme.

- **Sí: salir de pantalla completa al abrir el modal de fin de partida.** Razón: `.modal-bd`
  se renderiza fuera del elemento en pantalla completa, así que en modo nativo sería
  invisible. Salir es más simple y más robusto que mover el modal dentro del contenedor.

- **Sí: `touch-action: none` solo en CRT y botonera.** Razón: mata el doble-tap-zoom y el
  arrastre accidental justo donde estorban, sin degradar la accesibilidad del resto del sitio.

- **No: `export const viewport` con `userScalable: false`.** Razón: afecta a todas las
  páginas y quita el zoom a quien lo necesita, a cambio de un caso extremo ya cubierto por
  `touch-action`.

- **Sí: `--crt-ratio` por juego, también en escritorio.** Razón: el `4 / 3` fijo ya era una
  simplificación equivocada para Snake y Tetris; arreglarlo en los dos entornos evita
  mantener dos comportamientos distintos.

- **Sí: pieza siguiente encima del tablero en móvil.** Razón: ver la siguiente pieza es
  información de juego real y ocultarla cambiaría la dificultad; moverla arriba libera el
  ancho completo para el tablero sin quitar nada.

- **No: la play-page genérica `/games/[id]/play`.** Razón: es un simulador con contador
  aleatorio, no tiene input que adaptar.

- **No: vibración al pulsar.** Razón: `navigator.vibrate` no existe en iOS y sería un
  detalle presente solo en la mitad de los dispositivos.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Safari de iPhone no soporta `requestFullscreen` fuera de `<video>` | El hook detecta el soporte y cae al modo fijo por CSS; el botón nunca desaparece ni falla. |
| Una acción `hold` se queda "pegada" si el dedo sale del botón o llega una llamada entrante | `setPointerCapture` más `release` en `pointerup`, `pointercancel` y al cambiar `disabled`; verificado por criterio de aceptación. |
| `touch-action: none` sobre el CRT impide hacer scroll con el dedo sobre el juego | Es el comportamiento buscado; el resto de la página conserva scroll y zoom, y hay margen suficiente alrededor del CRT. |
| `100dvh` se comporta de forma distinta con la barra de direcciones de iOS | El layout no depende de una altura exacta: el CRT usa una altura acotada y la botonera fluye debajo. |
| Tocar los cuatro juegos puede romper el teclado en escritorio | El corte vertical del paso 4 valida el patrón en un solo juego antes de replicarlo, y hay un criterio explícito de no-regresión por juego. |
| Un juego futuro nazca sin controles táctiles | `CLAUDE.md` documenta `inputRef` como parte del contrato y `references/games-with-touch.md` deja visible qué falta. |

---

## Lo que **no** entra en este spec

- Gestos: swipe en Snake y arrastre de la pala en Arkanoid.
- La play-page genérica `/games/[id]/play`.
- Orientación horizontal y aviso de rotar el dispositivo.
- Adaptación móvil de `/games`, `/games/[id]`, `/hall-of-fame`, `/about`, `/auth` y la `Nav`.
- Bloqueo global del zoom del navegador.
- Vibración, remapeo de botones y soporte de mando físico.
- PWA, instalación y modo offline.

Cada una de ellas, si llega, va en su propio spec.
