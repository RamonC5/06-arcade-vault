# Sugerencias de juegos — memoria de game-planner

Ledger de todo lo que el agente `game-planner` ha propuesto para Arcade Vault. El agente lee este
archivo antes de proponer nada y añade una ronda al final de cada ejecución, de modo que nunca
repite una idea entre sesiones.

Estados: `Sugerido` · `Elegido` · `En spec` · `Implementado` · `Descartado`

## Índice

| #   | Juego    | Cat     | Estado   | Ronda | Fecha      | Nota                                       |
| --- | -------- | ------- | -------- | ----- | ---------- | ------------------------------------------ |
| 1   | INVADERS  | SHOOTER | Sugerido | 01    | 2026-08-17 | Ranking #1. Usa `.cover-invaders` (libre)               |
| 2   | RANA      | ARCADE  | Sugerido | 01    | 2026-08-17 | Ranking #2. Usa `.cover-rana` (libre)                   |
| 3   | GLOTÓN    | ARCADE  | Sugerido | 01    | 2026-08-17 | Ranking #3. Usa `.cover-glot` (libre)                   |
| 4   | TUBERÍAS  | PUZZLE  | Sugerido | 02    | 2026-08-17 | Traza tubería vs. flujo. Cover nueva. Esfuerzo Medio     |
| 5   | BURBUJAS  | PUZZLE  | Sugerido | 02    | 2026-08-17 | Cañón + agrupar color. Cover nueva. Esfuerzo Medio       |
| 6   | CADENA    | PUZZLE  | Sugerido | 02    | 2026-08-17 | Match-3 con cascadas. Cover nueva. Cerca de `tetris`     |
| 7   | LUMEN     | PUZZLE  | Sugerido | 02    | 2026-08-17 | Espejos + haz de luz. Cover nueva. Riesgo: gen. procedural |
| 8   | SECUENCIA | PUZZLE  | Sugerido | 02    | 2026-08-17 | Simon Says con paleta del sistema. Esfuerzo Bajo         |
| 9   | BASTIÓN   | SHOOTER | Sugerido | 02    | 2026-08-17 | Missile Command: `lives`=ciudades. Cover nueva           |
| 10  | NÚCLEO    | SHOOTER | Sugerido | 02    | 2026-08-17 | Torreta central 360°. El más barato. Cover nueva         |
| 11  | BLINDADO  | SHOOTER | Sugerido | 02    | 2026-08-17 | Tanques + rebote. Reclama `.cover-duelo`                 |
| 12  | ENJAMBRE  | SHOOTER | Sugerido | 02    | 2026-08-17 | Twin-stick sin inercia, contrapunto de `asteroids`       |
| 13  | TÚNEL     | SHOOTER | Sugerido | 02    | 2026-08-17 | Scroll lateral en gruta. Score por distancia, riesgo     |
| 14  | REFLEJO   | SHOOTER | Sugerido | 02    | 2026-08-17 | No disparas, devuelves. Reclama `.cover-duelo`           |
| 15  | PULSO     | ARCADE  | Sugerido | 02    | 2026-08-17 | Ritmo visual sin audio central. El más barato del lote   |
| 16  | ASEDIO    | ARCADE  | Sugerido | 02    | 2026-08-17 | Esquiva pura sin arma, patrones bullet-hell. Cover nueva |
| 17  | VÓRTICE   | ARCADE  | Sugerido | 02    | 2026-08-17 | Reflejo con 2 teclas. `lives` fijo a 1, cámara rotatoria |
| 18  | ASCENSO   | ARCADE  | Sugerido | 02    | 2026-08-17 | Plataformas verticales infinitas. Esfuerzo Medio/Alto    |
| 19  | ESPEJO    | ARCADE  | Sugerido | 02    | 2026-08-17 | Dos palas, un jugador, supervivencia. Reclama `.cover-duelo` |
| 20  | TORRE     | ARCADE  | Sugerido | 02    | 2026-08-17 | Donkey Kong: salto + gravedad, inédito en catálogo       |
| 21  | FLIPPER   | ARCADE  | Sugerido | 02    | 2026-08-17 | Pinball retroiluminado. Física más delicada del lote     |
| 22  | CIRCUITO  | ARCADE  | Sugerido | 02    | 2026-08-17 | Carreras scroll vertical. Solapa parcial con RANA        |
| 23  | SAMURÁI   | ARCADE  | Sugerido | 02    | 2026-08-17 | Duelo 1v1 por reflejos, señal + reacción. Esfuerzo Bajo  |

## Rondas

### Ronda 00 — línea base (2026-08-17)

**Catálogo:** 4 juegos (2 ARCADE — `arkanoid`, `snake`; 1 PUZZLE — `tetris`; 1 SHOOTER —
`asteroids`).
**Portadas libres en `globals.css`:** `.cover-invaders`, `.cover-glot`, `.cover-rana`,
`.cover-duelo`.

Ronda de inicialización: se crea la memoria sin propuestas registradas.

### Ronda 01 — 2026-08-17

**Catálogo:** 4 juegos (2 ARCADE, 1 PUZZLE, 1 SHOOTER). Colores: 2 `cyan`, 1 `yellow`, 1 `green`,
0 `magenta`. Portadas libres: `.cover-invaders`, `.cover-glot`, `.cover-rana`, `.cover-duelo`.
**Hueco detectado:** falta un disparo de pantalla fija con oleadas — el único SHOOTER es `asteroids`
(vectorial, con inercia) y la portada `.cover-invaders` lleva dibujada sin dueño desde el diseño
original.

**Propuestas:**

1. **INVADERS** (`invaders`, SHOOTER) — cubre la categoría más floja, estrena el color `magenta`,
   reutiliza `.cover-invaders` y mapea `score`/`lives`/`level` (oleada) sin inventar campos.
2. **RANA** (`rana`, ARCADE) — mecánica de esquiva por carriles, inexistente en el catálogo;
   reutiliza `.cover-rana` y se dibuja con primitivas.
3. **GLOTÓN** (`gloton`, ARCADE) — laberinto con persecución; reutiliza `.cover-glot`, pero la IA de
   los cuatro fantasmas y el diseño del laberinto lo hacen el más caro de los tres.

**Descartados en esta ronda:** DUELO/Pong `.cover-duelo` (repite el rebote pala-bola de `arkanoid` y
su marcador no es acumulable, encaja mal con `scores`), COLUMNAS (repite la familia de piezas que
caen de `tetris`), MINAS/buscaminas (se juega con ratón y su score natural es tiempo, donde menos es
mejor), SOKOBAN (buen equilibrio de categoría pero puntuación con techo: el juego perfecto empata a
todo el mundo en el leaderboard), CIEMPIÉS (mecánica interesante pero exige portada nueva y compite
con el #1 dentro de SHOOTER), 2048 (score ideal para la tabla, pero sin portada libre y sin `lives`
ni `level` naturales).

**Nota para la próxima ronda:** el hueco PUZZLE (1 solo juego) sigue abierto; ningún candidato
PUZZLE pasó el filtro de leaderboard acumulativo. Conviene reabrir SOKOBAN o 2048 solo si se acepta
un campo de HUD custom o un score por tiempo/eficiencia.

**Decisión:** pendiente.

### Ronda 02 — 2026-08-17 (exploración paralela, 20 candidatos)

**Método (distinto de lo habitual):** a petición del usuario, esta ronda se ejecutó con 5 agentes
`game-planner` en paralelo, cada uno con un foco distinto (PUZZLE, SHOOTER, ARCADE de
reflejos/timing, balance de color + reutilización de `.cover-duelo`, y barrido amplio de arcade
clásico). Para evitar que 5 escrituras simultáneas corrompieran este archivo, ninguno de los 5
escribió el ledger: cada uno devolvió su análisis en texto y el orquestador (sesión principal)
consolidó, depuró y firmó esta única entrada.

**Catálogo de partida:** el mismo que la Ronda 01 (4 implementados) más las 3 propuestas de esa
ronda, todavía con decisión pendiente.

**Depuración aplicada sobre las 25 propuestas brutas** (5 agentes × 5 candidatos):

- Colisión de nombre/slug `enjambre` (dos juegos distintos con el mismo id): el SHOOTER twin-stick
  conserva `enjambre`; el ARCADE de esquiva pura sin arma se renombra a **ASEDIO**.
- Colisión de nombre/slug `rally`: la reinterpretación de Pong-supervivencia se descarta (ver abajo);
  el juego de carreras conserva el hueco y se renombra a **CIRCUITO** para no chocar.
- **FUGA** (PUZZLE) se elimina por ser duplicado conceptual exacto de **TUBERÍAS**: mismo pitch
  ("traza la tubería antes de que llegue el fluido"), misma mecánica, propuesto por dos agentes
  distintos sin saberlo.
- Se retiran 3 candidatos que sus propios agentes señalaron como el más flojo o redundante de su
  lote: **INVERSIÓN** (ARCADE — "no tiene sentido construir los dos" junto a ASCENSO, que es más
  rico), **RALLY/Pong-supervivencia** (ARCADE — "el más débil de los cinco en originalidad", y
  competía por `.cover-duelo` con otros tres), **CERCO** (ARCADE — esfuerzo Alto, "no conviene
  primer candidato de una ronda"), **APAGÓN** (PUZZLE — "techo de habilidad bajo", el algoritmo
  determinista aplana el leaderboard).

De 25 brutos quedan **20 candidatos limpios**.

**Avisos de contención para cuando se elija uno:**

- `.cover-duelo` (única portada libre reutilizable) la reclaman a la vez **BLINDADO**, **REFLEJO** y
  **ESPEJO**. Solo uno puede quedarse el arte existente; los otros dos necesitarían portada nueva
  (coste bajo: son ~15-25 líneas de CSS, no un spritesheet).
- 8 de los 20 candidatos piden `magenta` (el color sin estrenar del catálogo): normal al no
  coordinarse los 5 agentes entre sí, pero la elección final debe repartir colores, no apilarlos.

**Propuestas (20, agrupadas por categoría):**

*PUZZLE — el hueco más urgente (hoy 1 de 4 juegos):*

1. **TUBERÍAS** (`tuberias`) — coloca tramos de tubería contra un fluido que avanza solo; score por
   tramo recorrido, sin techo. Esfuerzo Medio, sin parentesco mecánico con `tetris`.
2. **BURBUJAS** (`burbujas`) — cañón que dispara burbujas de color a una rejilla hexagonal; premia
   provocar desprendimientos en cascada. Esfuerzo Medio, el más denso de sus 5.
3. **CADENA** (`cadena`) — match-3 por intercambio con cascadas encadenadas. Esfuerzo Medio, pero es
   el más parecido a `tetris` (rejilla vertical + muerte por techo).
4. **LUMEN** (`lumen`) — gira espejos para llevar un haz a los núcleos antes de que se agote el
   reloj. Esfuerzo Medio; riesgo concentrado en que la generación de tableros sea siempre resoluble.
5. **SECUENCIA** (`secuencia`) — Simon Says visual con los 4 colores del sistema. Esfuerzo Bajo, el
   más barato de cerrar si se prioriza velocidad sobre profundidad.

*SHOOTER (hoy 1 de 4 juegos, sin contar INVADERS pendiente):*

6. **BASTIÓN** (`bastion`) — defensa de base tipo Missile Command; `lives` = ciudades en pie, el
   mapeo más literal de todo el catálogo. Esfuerzo Medio.
7. **NÚCLEO** (`nucleo`) — torreta anclada al centro, enemigos entrando por los 4 bordes. El
   candidato más barato de las 20 propuestas (Bajo).
8. **BLINDADO** (`blindado`) — tanques cenitales con disparo que rebota una vez; reclama
   `.cover-duelo`. Esfuerzo Medio, riesgo en la IA del rival.
9. **ENJAMBRE** (`enjambre`) — twin-stick simplificado (WASD mover, flechas apuntar), contrapunto
   sin inercia ni wrap de `asteroids`. Esfuerzo Bajo-Medio.
10. **TÚNEL** (`tunel`) — scroll lateral por una gruta con colisión contra terreno procedural.
    Esfuerzo Medio-Alto; el score por distancia necesita ponderarse bien frente a las bajas.
11. **REFLEJO** (`reflejo`) — no disparas, devuelves proyectiles con el ángulo de impacto; reclama
    `.cover-duelo`. Esfuerzo Medio.

*ARCADE (ya la categoría más poblada — priorizar solo si aporta mecánica nueva):*

12. **PULSO** (`pulso`) — precisión temporal tipo "beatmatch" visual, sin audio como mecánica
    central. El más barato de las 20 propuestas junto a NÚCLEO (Bajo).
13. **ASEDIO** (`asedio`) — esquiva pura sin arma en arena abierta, patrones de proyectiles
    declarativos. Esfuerzo Medio; cuidado con parecerse a `asteroids` en silueta.
14. **VÓRTICE** (`vortice`) — dos teclas, orbitar un núcleo esquivando muros que se contraen.
    Esfuerzo Bajo/Medio; `lives` fijo a 1 y cámara rotatoria como fricciones declaradas.
15. **ASCENSO** (`ascenso`) — plataformas verticales infinitas con generación procedural, único con
    salto y gravedad. Esfuerzo Medio/Alto, el "game feel" es la parte que más iteración pide.
16. **ESPEJO** (`espejo`) — un jugador controla dos palas a la vez contra bolas que no pueden salir;
    reclama `.cover-duelo`. Esfuerzo Bajo.
17. **TORRE** (`torre`) — subir esquivando barriles tipo Donkey Kong; única familia de mecánica con
    gravedad y salto real del lote. Esfuerzo Alto.
18. **FLIPPER** (`flipper`) — mesa de pinball con bumpers y multiplicador. El mejor encaje de
    leaderboard de las 20 propuestas, pero la física más delicada de escribir. Esfuerzo Alto.
19. **CIRCUITO** (`circuito`) — carreras con scroll vertical infinito y adelantamientos. Esfuerzo
    Medio; solapa parcialmente con RANA (ronda 01) en la esquiva lateral.
20. **SAMURÁI** (`samurai`) — duelo 1v1 por reflejos: señal con retardo aleatorio, gana quien
    reacciona primero. Esfuerzo Bajo/Medio.

**Descartados en esta ronda:** FUGA (duplicado exacto de TUBERÍAS), INVERSIÓN (redundante con
ASCENSO), RALLY/Pong-supervivencia (el más débil de su lote, además de competir por `.cover-duelo`),
CERCO (esfuerzo Alto, mal primer candidato), APAGÓN (techo de habilidad bajo). Cada uno de los 5
agentes también descartó dentro de su propio foco variantes que colisionaban con el catálogo o con
otras propuestas de esta misma ronda (NONOGRAMA/PICROSS, KLOTSKI, TEMPEST, DEFENDER, TOPO/whack-a-mole,
MALABAR, DIG DUG, POLE POSITION, DECATLÓN, SQUASH, TRON, match-3 con caída, apilar torres, cualquier
mecánica dependiente de audio o de ratón); el detalle completo de cada descarte está en la respuesta
que el orquestador entregó al usuario en la sesión de 2026-08-17, no se reproduce aquí por espacio.

**Decisión:** pendiente.
