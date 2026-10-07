---
funcionalidad: attributes
titulo: Atributos
resumen: Un nivel por cada área de las quests (Salud, Estudio…), calculado de las quests completadas y dibujado en un radar junto al muñeco.
tipo: dominio
eventos: []
preferencias: []
adr: [ADR-20, ADR-23]
---

# Atributos

Cada **área** de las quests («Salud», «Estudio», «Hogar»…) es un **atributo** del personaje con su propio nivel, que sube con la XP de las quests completadas en esa área. El radar dice en qué partes de tu vida avanzas y cuáles tienes abandonadas. Se ve en la ventana del personaje (tecla `P`), junto al muñeco ([equipment](../equipment/README.md)).

## Qué hace

| # | Requisito | Cómo se cumple |
|---|---|---|
| R1 | Cada área es un atributo con su propio nivel | `AttributeState` por área (normalizada) y `attributeLevel(xp)` |
| R2 | Verlos en un radar | `AttributesPanel`: radar de las 6 áreas con más XP y la lista completa con barras |
| R3 | Junto al muñeco del personaje | Panel derecho de `CharacterModal` |

## Reglas y decisiones

### Sin eventos: se calcula de `quest_completed`

La proyección suma la XP de cada `quest_completed` válido al área de su quest (`gainAttribute`), con la XP **copiada en el evento**. Así es **retroactivo** (las quests ya completadas suben sus atributos) y un completado duplicado de otro equipo no cuenta dos veces. Va en el acumulador, y no en `finishProjection`, porque una quest retirada sale de `quests` y su XP tiene que seguir contando, como la del jugador ([ADR-20](../../../docs/decisions/ADR-20-atributos-calculados.md)).

### Las áreas las escribe el usuario

- **Normalización** (`areaKey`): sin espacios de más y en minúsculas. «Salud», « salud » y «SALUD» son el mismo atributo, que se muestra como se escribió **la última vez**.
- **Áreas conocidas** (`KNOWN_AREAS`): 17 áreas habituales (salud, ejercicio, estudio, lectura, hogar, administración, trabajo, finanzas, vida social, familia, creatividad, música, idiomas, programación, cocina, mente y ocio) con sus formas en español, japonés e inglés. Su clave es `@id` (`@health`): «Salud» y «健康» suben **el mismo** atributo, que se muestra traducido (`attributes.areas.<id>`). Las demás áreas no se traducen: son texto del usuario ([ADR-23](../../../docs/decisions/ADR-23-listas-y-areas-conocidas.md)).
- **Cambiar los sinónimos une atributos**: sube `PROJECTION_VERSION`.
- **Un `Map`, no un objeto**: un área llamada «__proto__» rompería un objeto plano.
- **Sin área, sin atributo**: esas quests dan XP al jugador pero no suben nada; los encargos tampoco (no tienen área).

### La curva y el radar

- `attributeXpToNext(n) = 60 · n^1,3`, más suave que la del jugador (`100 · n^1,4`), porque cada área recibe solo una parte de la XP: el nivel 5 de un área cuesta 822 XP (unas 6–8 quests normales). Sin tope.
- Ejes del radar: las **6 áreas con más XP** (`RADAR_AXES`); con menos de 3 no hay polígono y queda la lista.
- Borde: el múltiplo de 5 por encima del nivel más alto (5 como mínimo, `radarScale`), para que la forma enseñe el equilibrio y crezca por saltos. Cada eje incluye la fracción del nivel en curso.

## Modelo

| Función (`model.ts`, puro) | Qué hace |
|---|---|
| `cleanArea(area)` / `areaKey(area)` | El área sin espacios de más / su clave (`@id` si es conocida; si no, en minúsculas) |
| `knownArea(area)`, `knownAreaOfKey(key)` | El área conocida de lo escrito o de una clave |
| `gainAttribute(acc, area, xp, ts)` | Suma una quest completada a su área |
| `attributeXpToNext(n)`, `attributeLevel(xp)` | La curva y el nivel |
| `listAttributes(acc)` | Los atributos con su nivel, de más a menos XP (estable por nombre) |
| `radarScale(attrs)`, `radarPoints(values, scale)` | Borde del radar y vértices del polígono |

`AttributesAcc` es un `Map<clave, AttributeState>` (`key`, `name`, `xp`, `quests`, `lastAt`); `PlayerState.attributes` es la lista de `Attribute` (con `level`, `levelXp`, `levelXpNeeded`).

## Eventos

No tiene eventos propios: lee `quest_completed`.

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | Todo lo anterior. Puro |
| `labels.ts` | `attributeName`, `areaName`, `areaSuggestions` (traducen las áreas conocidas) |
| `components/AttributesPanel.tsx` | Radar y lista |
| `attributes.css`, `i18n.ts` | Estilos y textos es + ja |
| `model.test.ts` | Normalización, «__proto__», la curva, el orden, el radar y las áreas conocidas |

## Integración

| Fuera de la carpeta | Cambio |
|---|---|
| `src/domain/types.ts` | `PlayerState.attributes` |
| `src/domain/projection.ts` | `ProjectionAcc.attributes`; `gainAttribute` en `quest_completed`; `listAttributes` en `finishProjection` |
| `src/features/equipment/components/CharacterModal.tsx` | Aloja `<AttributesPanel />` |
| `src/components/QuestDetail.tsx`, `src/components/CreateQuestModal.tsx` | El área traducida; sugerencias de áreas en el formulario (`datalist`) |
| `src/i18n/locales/{es,ja}.ts` | Montan `attributes` |
| `src/test/streams.ts` | Áreas escritas de varias formas en las quests de `randomStream` |

## Dependencias

- No importa otras funcionalidades.
- **La usan:** `equipment` (el panel), `chronicle` (subidas de atributo y nombres traducidos).

## Estado actual

- **Última verificación:** 2026-10-02, tests y navegador (radar y lista con seis áreas, también en japonés; un snapshot antiguo saca los atributos de lo ya completado).
- **Tests:** `model.test.ts` y, en `src/domain/projection.test.ts`, el invariante de que los atributos nunca suman más XP que el jugador.
- **Sin verificar:** la app nativa y Windows.
- **Historial:** [docs/history/verificacion/attributes.md](../../../docs/history/verificacion/attributes.md).

## Pendiente

- Juntar o renombrar áreas desde la ventana del personaje.
- Una racha por área (días seguidos con alguna quest de esa área).
- Más áreas conocidas, o que el usuario traduzca las suyas.
