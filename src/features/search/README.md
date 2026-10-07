---
funcionalidad: search
titulo: Búsqueda
resumen: Ventana (/ o ⌘K) que busca en quests, encargos, agenda y objetos sin tildes ni distinción de kana, y lleva a lo encontrado.
tipo: presentación
eventos: []
preferencias: []
adr: [ADR-48]
---

# Búsqueda

Una ventana para encontrar cualquier cosa: `/` o `⌘K` / `Ctrl+K`, la lupa de la cabecera o la tarjeta «Search» del [menú](../menu/README.md) (en el teléfono, solo esta última). Busca en quests (también las terminadas y las fallidas), encargos, bloques de la agenda y objetos del almanaque.

## Qué hace

| # | Requisito | Cómo se cumple |
|---|---|---|
| R1 | Encontrar una quest o un encargo sin recorrer los tablones | `search()` sobre todo lo que escribe el usuario |
| R2 | Sin preocuparse por tildes ni mayúsculas | `fold`: minúsculas, sin tildes, ancho normal, katakana = hiragana |
| R3 | Ir a lo encontrado | `openHit`: tablón, cartel, calendario o almanaque |

## Reglas y decisiones

| Dónde busca | Campos |
|---|---|
| Quest | Título, descripción, encargado por, área, tipo, objetivos, casillas de las listas y contactos |
| Encargo | Título, lugar, notas, nombres de los adjuntos y contactos |
| Bloque de la agenda | Título y notas |
| Objeto | Nombre y descripción |

- Cada palabra tiene que estar en algún campo. Puntúa más el título (empieza por la palabra > una palabra del título empieza así > la contiene); lo que está por hacer va antes que lo terminado y, a igualdad, lo más reciente. Como mucho 40 resultados. Si coincide fuera del título, se enseña el trozo.

| Resultado | Lleva a |
|---|---|
| Quest en el tablón | El Quest Board con ella elegida |
| Quest terminada o fallida | Una copia en el formulario, para clavarla otra vez ([failure](../failure/README.md)) |
| Encargo | Su cartel abierto |
| Bloque | El calendario, en el próximo día que lo tiene, con su formulario |
| Objeto | El almanaque |

Sin tildes ni distinción de kana, en vez de buscar solo en títulos: [ADR-48](../../../docs/decisions/ADR-48-alta-rapida-y-busqueda.md).

## Eventos

No tiene eventos: es interfaz pura sobre el estado.

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | `fold`, `terms`, `search`. Puro |
| `actions.ts` | `openSearch`, `closeSearch`, `openHit` |
| `ui.ts` | Si está abierta; `searchBusy` |
| `components/SearchModal.tsx` | La ventana y el botón de la lupa (`SearchButton`) |
| `search.css`, `i18n.ts` | La ventana (a pantalla completa en el teléfono) y textos es + ja |
| `model.test.ts` | Tildes, todas las palabras, campos y kana |

## Integración

| Fuera de la carpeta | Cambio |
|---|---|
| `src/App.tsx` | `/` y `⌘K` / `Ctrl+K`; `SearchModal`; `searchBusy()` |
| `src/components/Header.tsx` | Lupa (`SearchButton`) |
| `src/components/Footer.tsx` | Tecla `/` |
| `src/i18n/locales/{es,ja}.ts` | Montan `search` |

## Dependencias

- **features/temporal**, **features/agenda**, **features/items**, **features/checklist** (sus `model.ts`): los datos en los que busca.
- **features/temporal**, **features/agenda**, **features/calendar** (sus acciones y `ui.ts`): abrir un cartel, un bloque o un día; también el `Skull` de los resultados.
- **features/failure** (`actions.ts`: `repostQuest`, `repostTemporal`): volver a clavar lo fallido.
- Para cambiar la búsqueda no hace falta leer esos README.
- **La usan:** `menu` (tarjeta Search), `calendar` y `temporal` (su teclado espera con la búsqueda abierta).

## Estado actual

- **Última verificación:** 2026-10-06, tests y navegador (`/` y «informe» encuentra la quest fallida para volver a clavarla).
- **Tests:** `model.test.ts`.
- **Sin verificar:** la app nativa.
- **Historial:** [docs/history/verificacion/search.md](../../../docs/history/verificacion/search.md).
