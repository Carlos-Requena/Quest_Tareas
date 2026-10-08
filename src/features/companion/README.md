---
funcionalidad: companion
titulo: Compañero de Mi día
resumen: Un personaje del menú acompaña en «Mi día» con un cuadro de diálogo de JRPG que comenta la situación del día, con frases de serie o escritas por el jugador.
tipo: dominio
eventos: [companion_chosen, companion_line_added, companion_line_updated, companion_line_removed]
preferencias: []
adr: [ADR-52]
---

# Compañero de Mi día

Arriba de [Mi día](../today/README.md), un cuadro de diálogo de JRPG: el retrato del compañero (recortado al busto, con el color de su aura), su nombre y una frase que se escribe letra a letra comentando cómo va el día. Al tocarlo, termina de escribir o dice otra. Lo que dice y quién acompaña se elige en la pestaña **Mi día** del personaje, en la [personalización](../customize/README.md).

## Qué hace

| # | Requisito del propietario | Cómo se cumple |
|---|---|---|
| R1 | Un compañero en Mi día que te comenta lo que te queda hoy | `CompanionBox` en `TodayView`, con la situación del plan del día (`companionContext`) |
| R2 | Con frases por situación | Siete situaciones, tres frases de serie en cada una y las que escriba el jugador |
| R3 | Que se pueda personalizar desde Customize | Pestaña Mi día del personaje: frases por situación y «Que me acompañe en Mi día» |

## Reglas y decisiones

- **Situación** (`situationOf`), de más a menos urgente: lo que **se pierde esta noche**, una **racha** en peligro, lo que hay **en curso**, lo que **toca hoy**; sin nada pendiente, que **se perdió** algo hoy, el día **cumplido** o el **día libre**. Sale del plan de [Mi día](../today/README.md) (`todayPlan`), así que siempre coincide con sus bloques.
- **Quién acompaña** (`companionOf`): el elegido, si sigue existiendo; si no, el personaje de hoy del menú (con lo que se haya elegido para hoy en ese equipo). Elegir es un evento: el mismo compañero en todos los equipos.
- **Qué dice:** sus frases para esa situación, si tiene; si no, una de las tres de serie (`companion.say.<situación>`). Las suyas **sustituyen** a las de serie, como en el menú. Al cambiar la situación o el compañero, otra al azar; al tocar, una distinta de la anterior (`pickIndex`).
- **Huecos:** las frases (de serie y del jugador) pueden llevar `{{title}}` (lo más urgente de la situación), `{{n}}` (cuántas, o la racha) y `{{time}}` (lo que queda); `fillLine` los rellena y deja vacío lo que no aplica.
- Hasta 240 caracteres por frase, sin límite de frases (las mismas reglas de texto que las del menú: `cleanVoice`). Lo que escribe el jugador no se traduce.
- Descartado: reutilizar `VoiceLine` del menú con «partes del día» que fueran situaciones (mezcla dos cosas distintas en un mismo campo) y elegir el compañero solo en este equipo (el propietario lo quiere igual en todos).

## Modelo

`CompanionLine { id, characterId, situation: Situation, text, createdAt }` y `CompanionAcc { chosen?, lines, linesDeleted }` en `ProjectionAcc.companion`; en el estado, `GameState.companion { chosen?, lines }`. Funciones puras de `model.ts`: `situationOf`, `applyCompanionEvent`, `dropCompanionOf`, `companionLinesOf`, `companionOf`, `pickIndex`, `fillLine`. `day.ts` (usa el plan de Mi día, que sale de la proyección: el dominio no lo importa) da `companionContext`.

## Eventos

| Evento | Datos | Efecto | Guarda |
|---|---|---|---|
| `companion_chosen` | `characterId?` | Lo elige; sin id, vuelve al personaje de hoy | Se ignora si el personaje no existe |
| `companion_line_added` | `line: CompanionLine` | La añade (texto limpio y recortado) | Se ignora si el id existe o se quitó, el texto queda vacío, la situación no existe o el personaje no existe |
| `companion_line_updated` | `lineId`, `text` | Cambia el texto | Si existe y el texto no queda vacío |
| `companion_line_removed` | `lineId` | La quita; el id queda retirado | Si existe |

Quitar un personaje (`character_removed`) se lleva sus frases y, si era el compañero, se vuelve al personaje de hoy. El acumulador ganó el compañero, así que `PROJECTION_VERSION` pasó a 13. Un equipo sin actualizar ignora estos eventos y no enseña el cuadro.

## Interfaz

- **El cuadro** es un botón: tocarlo termina de escribir la frase o, si ya está escrita, dice otra (`sfx.move`). Lo que falta por escribir ocupa su sitio sin verse, así que el cuadro no cambia de alto. La flecha de «sigue» parpadea al terminar.
- **Retrato:** el doble de alto que el marco, recortado por arriba (de la cabeza a la cintura); un vídeo se reproduce igual.
- **Rótulo** de cada situación en inglés (Last Day, Streak, In Progress, Today, Lost, Clear, Free Day), como los bloques de Mi día; el de lo urgente, en rojo, y el de la racha, en naranja.
- Con «reducir movimiento», la frase sale de golpe y nada se mueve.
- **Teléfono:** retrato de 80 px, sin el nombre de la situación al lado del personaje.

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | Puro: situaciones, frases, guardas, quién acompaña, huecos |
| `events.ts` | Los cuatro eventos |
| `day.ts` | `companionContext`: la situación y los huecos a partir del plan de Mi día |
| `actions.ts` | `chooseCompanion`, `addCompanionLine`, `updateCompanionLine`, `removeCompanionLine` |
| `components/CompanionBox.tsx` | El cuadro de diálogo |
| `companion.css`, `i18n.ts` | Cuadro, retrato y flecha (con su bloque de teléfono); situaciones, rótulos y frases de serie es + ja |
| `model.test.ts` | Situación, frases, guardas, elegir y quitar, huecos y la frase siguiente |

## Integración

| Fuera de la carpeta | Cambio |
|---|---|
| `src/domain/events.ts` | `CompanionEventBody` en la unión |
| `src/domain/projection.ts` | `ProjectionAcc.companion`, los cuatro `case`, lo que se va con `character_removed` y `GameState.companion` |
| `src/domain/types.ts` | `GameState.companion: { chosen?, lines }` |
| `src/features/today/components/TodayView.tsx` | `<CompanionBox plan now />` arriba de la columna principal |
| `src/i18n/locales/{es,ja}.ts` | `companion: companionEs` / `companionJa` |
| `src/test/streams.ts` | `companionLine` y los cuatro eventos en `randomStream` |

## Dependencias

- **features/menu** (`model.ts`: `cleanVoice`; `MenuCast`: `useCast`, `CharacterImage`, `characterName`): los personajes, el de hoy y su imagen.
- **features/living** (`index`: `useCharacterStyle`, `AURA_TOKEN`): el color del aura en el retrato.
- **features/today** (`model.ts`: el tipo `TodayPlan`) y **features/streaks** (`model.ts`: `liveStreak`): la situación y los huecos. Si cambia la regla de un bloque de Mi día, cambia aquí sin tocar nada.
- **La usan:** `today` (el cuadro) y `customize` (la pestaña Mi día del personaje).

## Estado actual

- **Última verificación:** 2026-10-08, tests y navegador a 1.280 × 800 y 402 × 874, en español y japonés: el cuadro con Kazuma en «Toca hoy», tocarlo para otra frase, elegir a Aqua como compañera y escribirle una frase con `{{title}}` y `{{n}}`, que sale rellena en Mi día.
- **Tests:** `model.test.ts`.
- **Sin verificar:** cada situación en la vista de verdad (solo «Toca hoy»; las demás, en los tests), la app nativa, el iPhone de verdad y un compañero elegido llegando a otro equipo por Drive.
- **Historial:** [docs/history/verificacion/companion.md](../../../docs/history/verificacion/companion.md).
