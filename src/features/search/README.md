# Búsqueda

Una ventana para encontrar cualquier cosa: `/` o `⌘K` / `Ctrl+K` (y la lupa de la cabecera o la tarjeta «Search» del menú de opciones, [../menu/README.md](../menu/README.md); en el teléfono, solo esta última). Busca en quests (también las terminadas y las fallidas), encargos, bloques de la agenda y objetos del almanaque.

Sigue la convención del proyecto: **una carpeta por implementación** (`src/features/<nombre>/`).

---

## Requisitos

| # | Requisito | Cómo se cumple |
|---|---|---|
| R1 | Encontrar una quest o un encargo sin recorrer los tablones | `search()` sobre todo lo que escribe el usuario |
| R2 | Sin preocuparse por tildes ni mayúsculas | `fold`: minúsculas, sin tildes, ancho normal, katakana = hiragana |
| R3 | Ir a lo encontrado | `openHit`: tablón, cartel, calendario o almanaque |

---

## Decisiones de diseño

### Dónde busca

| Qué | Campos |
|---|---|
| Quest | Título, descripción, encargado por, área, tipo, objetivos, casillas de las listas y contactos |
| Encargo | Título, lugar, notas, nombres de los adjuntos y contactos |
| Bloque de la agenda | Título y notas |
| Objeto | Nombre y descripción |

Cada palabra de la búsqueda tiene que estar en algún campo. Puntúa más el título (empieza por la palabra > una palabra del título empieza así > la contiene) que el resto; lo que está por hacer va antes que lo terminado, y a igualdad, lo más reciente. Como mucho 40 resultados. Si coincide fuera del título, se enseña el trozo.

### Ir a lo encontrado

| Resultado | Lleva a |
|---|---|
| Quest en el tablón | El Quest Board con ella elegida |
| Quest terminada o fallida | Una copia en el formulario, para clavarla otra vez (features/failure) |
| Encargo | Su cartel abierto |
| Bloque | El calendario, en el próximo día que lo tiene, con su formulario |
| Objeto | El almanaque |

Sin eventos: es interfaz pura sobre el estado.

---

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | `fold`, `terms`, `search`. Puro |
| `actions.ts` | `openSearch`, `closeSearch`, `openHit` |
| `ui.ts` | Si está abierta |
| `search.css` | La ventana; a pantalla completa en el teléfono |
| `i18n.ts` | Textos es + ja |
| `components/SearchModal.tsx` | La ventana, la lupa y el botón de la cabecera |
| `model.test.ts` | Tildes, todas las palabras, campos y kana |

## Puntos de integración

| Fuera de la carpeta | Cambio |
|---|---|
| `App.tsx` | `/` y `⌘K` / `Ctrl+K`; `SearchModal`; `searchBusy()` |
| `components/Header.tsx` | Lupa |
| `components/Footer.tsx` | Tecla `/` |
| `features/menu` | La tarjeta «Search» (cierra el menú antes de abrir la búsqueda) |
| `features/calendar`, `features/temporal` | Su teclado espera con la búsqueda abierta |
| `i18n/locales/{es,ja}.ts` | Montan `search` |

---

## Verificación

Hecho el 2026-10-06.

- **Tests:** `model.test.ts`.
- **Navegador:** `/`, «informe» encuentra la quest fallida («Fallida · volver a clavar»); en el teléfono, «Buscar» en el menú «Más».

**No verificado:** la app nativa.
