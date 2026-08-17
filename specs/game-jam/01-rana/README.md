# Jam — RANA

**Fecha:** 2026-08-17
**Pedido:** "RANA | ARCADE | Sugerido | Ranking #2. Usa .cover-rana (libre) | RANA (rana, ARCADE) —
mecánica de esquiva por carriles, inexistente en el catálogo; reutiliza .cover-rana y se dibuja con
primitivas." Se toma como punto de partida: una variante mantiene la esquiva por carriles y la otra
explora un loop central distinto sobre el mismo tema.

## Variantes

1. **`01-cruce-de-ranas-game.md`** — CRUCE DE RANAS (ARCADE, `green`, `cover-rana`) — cruza cinco
   carriles de tráfico y cinco de río a saltos de casilla hasta ocupar los cinco nichos de la orilla
   antes de que se agote el temporizador. Mecánica elegida porque es la lectura más directa del tema
   (una rana salta entre puntos seguros atravesando un medio hostil) y añade al catálogo un loop de
   esquiva por carriles con salto discreto que hoy no existe.

2. **`02-rana-glotona-game.md`** — RANA GLOTONA (SHOOTER, `yellow`, `cover-glot`) — rana anclada en
   su nenúfar que gira la mira y dispara la lengua para enganchar varios insectos de un solo lametón,
   esquivando avispas y peleando contra una barra de hambre que drena. Mecánica elegida porque el otro
   rasgo definitorio de una rana es cazar al vuelo con la lengua, y convertirla en proyectil de
   alcance variable da un loop de puntería y riesgo controlado.

**Por qué son mecánicamente distintas:** en CRUCE DE RANAS el jugador mueve su avatar por una rejilla
y todo el juego es planificación de ruta y timing de esquiva, sin ningún ataque; en RANA GLOTONA el
avatar no se mueve nunca y todo el juego es apuntar, medir el alcance de un proyectil y decidir cuándo
soltarlo. Cambian el género (`ARCADE` vs. `SHOOTER`), el esquema de control (saltos discretos vs. giro
continuo + disparo mantenido) y la fuente de presión (temporizador de travesía vs. barra de hambre).

**Estado:** ambos specs en `Borrador`. Ninguno ha sido promovido a `Aprobado`. No se comprobó
colisión con el catálogo real ni con specs existentes — revísalo tú antes de aprobar.
