---
funcionalidad: horizon
titulo: Plazos
resumen: Filtro de los dos tablones por lo que falta para la fecha (1 día, 7 días, 2 semanas, 1 mes, +1 mes) y fecha límite de las quests.
tipo: dominio
eventos: []
preferencias: []
adr: [ADR-15]
---

# Plazos

Clasifica las quests y los encargos según **cuánto falta para su fecha**, con un filtro en cada tablón (tecla `H`, `Shift+H` hacia atrás) que muestra cuántos hay en cada plazo. Da también la **fecha límite** opcional de las quests. La planificación se hace en el [calendario](../calendar/README.md): los plazos son solo un filtro y los atajos de fecha del formulario.

| Plazo | Etiqueta (es · ja) | Días naturales que faltan | Color |
|---|---|---|---|
| `day` | 1 día · 残り1日 | Hoy, mañana o **vencido** | Rojo (`--elite`) |
| `week` | 7 días · 7日以内 | De 2 a 7 | Oro (`--gold`) |
| `fortnight` | 2 semanas · 2週間 | De 8 a 14 | Verde (`--request`) |
| `month` | 1 mes · 1か月 | De 15 a 30 | Cian (`--stamp`) |
| `later` | +1 mes · 1か月以上 | Más de 30 | Violeta (`--repeat`) |
| `none` | Sin fecha · 期限なし | Sin fecha (solo quests) | Gris |

## Qué hace

| # | Requisito del propietario | Cómo se cumple |
|---|---|---|
| R1 | Clasificar los dos tablones en «1 día», «7 días», «dos semanas» y «más de un mes» | `horizonOf(due, now)` y `<HorizonFilter>` en los dos tablones |
| R2 | Que las quests tengan fecha para clasificarlas | `QuestDef.dueAt` (fecha límite de todo el día) y la fecha del encargo al que pertenezca |
| R3 | Que la clasificación cambie sola con el tiempo | Se calcula con `now`: no se guarda ni genera eventos |

## Reglas y decisiones

- **Excluyentes y sin huecos.** Cada fecha cae en un solo plazo, así los contadores suman el total. Entre «dos semanas» y «más de un mes» había un hueco, y se añadió «1 mes» (de 15 a 30 días). Lo vencido va en «1 día»: es lo que pide atención ya, y la tarjeta lo marca aparte ([ADR-15](../../../docs/decisions/ADR-15-plazos-calculados.md)).
- **Días naturales** con `daysUntil` (de [temporal](../temporal/README.md)): «mañana a las 9:00» es 1 día aunque falten 20 horas, y el cambio de hora no descuadra la cuenta.
- **Se calcula, no se guarda**: una quest a 10 días está en «2 semanas» hoy y pasará sola a «7 días» dentro de 3.
- **La fecha de una quest** (`questDue`): la suya (medianoche local del día elegido; vence al acabar ese día) o la del encargo pendiente al que pertenece; si tiene las dos, la que llegue antes (el mismo día, la del encargo, que tiene hora). Sin ninguna, «Sin fecha». Una quest terminada ya no tiene plazo.
- **Las que se repiten no tienen fecha límite** (tras la primera vuelta quedaría vencida para siempre): el campo se oculta. Si pertenecen a un encargo, toman su fecha.
- **Filtro por tablón, estado de interfaz propio** (`useHorizonUi`, en `ui.ts`), sin guardar. En el Quest Board se combina con la categoría (los contadores cuentan la pestaña elegida). En el de encargos solo cuenta los pendientes; los cumplidos salen solo en «Todo».
- **Vuelta a «Todo»** al crear una quest o un encargo, o al saltar de un tablón a otro (desde el cartel o un requisito), para que lo elegido no quede oculto.

## Modelo

| Función (`model.ts`, puro) | Qué hace |
|---|---|
| `horizonOf(due, now)` | Plazo de una fecha (`none` sin fecha) |
| `isOverdue(due, now)` | Vencida (las de todo el día, al acabar su día) |
| `matchesHorizon(filtro, due, now)`, `countHorizons(lista, dueOf, now)` | ¿Entra en el filtro?; contadores |
| `questDue(q, temporals)` | Fecha de una quest: propia o de su encargo |
| `deadlineIn(días, now)` | Medianoche local de dentro de N días (respeta el cambio de hora) |
| `filtersFor(conSinFecha)` | Opciones del filtro, en orden |

`format.ts` (usa i18n) da la etiqueta corta («Mañana», «En 5 días») y la fecha («mar, 14 oct · 10:00»).

## Eventos

No tiene eventos propios. `dueAt` es un campo opcional de `QuestDef`: los datos antiguos salen «Sin fecha». Se cambia editando la quest ([editing](../editing/README.md)); la de un encargo, editando el encargo.

## Interfaz

- **Quest Board:** fila fina bajo las pestañas de categoría; el número va en una chapa sobre la esquina.
- **Tablón de encargos:** chapas oscuras sobre la madera bajo el título; la elegida, de pergamino.
- **Tarjetas:** el plazo junto a la categoría, con su color: «Mañana», «En 12 días», «Vencida» (en rojo lleno); con calavera si la fecha es de un encargo. El detalle añade «Plazo: mar, 14 oct (En 12 días)».
- **Formulario:** «Sin fecha», los atajos (1 día, 7 días, 2 semanas, 1 mes) u «Otra fecha».

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | Funciones puras |
| `format.ts` | Etiquetas y fechas en el idioma activo |
| `ui.ts` | Plazo elegido en cada tablón (Zustand), `cycleHorizon` (tecla `H`) y `HorizonSection` |
| `components/HorizonFilter.tsx` | Filtro con contadores (los dos tablones) |
| `components/DueChip.tsx` | Plazo en la tarjeta de quest |
| `components/DeadlineField.tsx` | Fecha límite en el formulario |
| `horizon.css`, `i18n.ts` | Estilos (con su bloque de teléfono) y textos es + ja |
| `model.test.ts` | Bordes de cada plazo, cambio de hora, `questDue`, contadores |

## Integración

| Fuera de la carpeta | Cambio |
|---|---|
| `src/domain/types.ts` | `QuestDef.dueAt`; `QuestState.temporalId` (calculado) |
| `src/domain/projection.ts` | `dueAt` tolerante al crear |
| `src/App.tsx` | Filtro y contadores del Quest Board; tecla `H` |
| `src/components/QuestCard.tsx` | `<DueChip>` en la cabecera de la tarjeta (`.card-tagline`) |
| `src/components/QuestDetail.tsx` | «Plazo: …» arriba a la derecha |
| `src/components/CreateQuestModal.tsx` | `<DeadlineField>`; el filtro vuelve a «Todo» al publicar |
| `src/components/Footer.tsx` | Tecla `H` en los dos pies |
| `src/features/temporal/components/TemporalBoard.tsx` | Filtro y contadores del tablón de encargos |
| `src/i18n/locales/{es,ja}.ts` | Montan `horizon` |

## Dependencias

- **features/temporal** (`model.ts`: `daysUntil`, `TemporalState`): días naturales y la fecha de los encargos. No hace falta leer su README.
- **La usan:** `temporal` (filtro de su tablón), `complex` y `quickadd` (vuelta a «Todo»).

## Estado actual

- **Última verificación:** 2026-10-02, tests y navegador (filtro en los dos tablones, tecla `H`, fecha límite «7 días», etiquetas, japonés y ventana de 1.024 px).
- **Tests:** `model.test.ts`.
- **Sin verificar:** la app nativa y Windows.
- **Historial:** [docs/history/verificacion/horizon.md](../../../docs/history/verificacion/horizon.md).

## Pendiente

- Ordenar el tablón por fecha al filtrar por plazo.
- Plazo «esta semana» / «este mes» por calendario, además de por días que faltan.
