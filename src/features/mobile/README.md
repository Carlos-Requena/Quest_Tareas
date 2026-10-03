# Interfaz de teléfono (iPhone)

Quests funciona en el **iPhone** como app nativa: el mismo proyecto de Tauri 2 compilado para iOS (`src-tauri/gen/apple`), con el mismo dominio, los mismos eventos, el mismo SQLite y la misma sincronización con Google Drive. Esta carpeta adapta la **interfaz** a una pantalla de unos 400 pt de ancho y táctil. Lo nativo de iOS (el inicio de sesión de Google) está en `src-tauri/plugins/web-auth` y se explica en [../sync/README.md](../sync/README.md).

Es una funcionalidad **sin eventos**: solo presentación. No cambia `project()`, ni el modelo, ni el snapshot.

---

## Requisitos

| # | Requisito | Cómo se cumple |
|---|---|---|
| R1 | Usar Quests en el iPhone | Tauri 2 para iOS (`pnpm tauri ios …`); el proyecto de Xcode está en `src-tauri/gen/apple` |
| R2 | Todo lo del Mac, no solo el día a día | Cada pantalla tiene su diseño de teléfono: tablón, detalle, encargos (cartel, formulario y animaciones), mercader, personaje y armario, objetos y almanaque, probabilidades, crónica, «Quest Clear» y el cofre |
| R3 | Sincronizar con el Mac | La misma sincronización con Google Drive; en iOS se inicia sesión con la hoja del sistema ([../sync/README.md](../sync/README.md)) |
| R4 | Que no se rompa el escritorio | Todo va en `@media (max-width: 760px)`; en el escritorio los componentes nuevos no se ven (`display: none` / `display: contents`) |
| R5 | Sin teclado | Barra de abajo, rombo de crear, toques y deslizar el dedo; las pistas «Pulsa Enter» se cambian por «Toca» |

---

## Decisiones de diseño

### CSS primero, JavaScript solo donde hace falta

El punto de corte es **760 px** (`PHONE_MAX_WIDTH`, en `phone.ts`, repetido a mano en cada `@media`). Casi todo es CSS: la misma estructura de componentes se recoloca. JavaScript solo decide lo que el CSS no puede:

| Qué | Dónde |
|---|---|
| Al tocar una tarjeta, abrir su detalle a pantalla completa | `App.tsx` (`isPhone()` → `openDetail`) |
| Aceptar cierra antes el detalle (ver más abajo) | `actions.ts` (`detailPrimaryAction`) |
| Un toque abre el cartel de un encargo (en el escritorio, el primero lo elige) | `temporal/components/Poster.tsx` |
| La crónica enseña una página cada vez y pagina con ese ancho | `chronicle/components/ChronicleModal.tsx` (`per`) |
| «Toca para continuar» en vez de «Pulsa Enter» | `components/KeyHint.tsx`, `LootChest`, `TemporalBoard` |

Se descartó una app aparte para el móvil: duplicaría las pantallas y se desincronizarían. Y una PWA no puede guardar el token de Google en el llavero ni hablar con Drive sin abrir la CSP (ADR-28).

### El armazón

- **Cabecera en dos filas**: emblema, «Quest Board» y oro con las quests en curso; debajo, rango, nivel y la barra de XP a lo ancho. El idioma, la música, el silencio, Google Drive y los botones de ventanas salen de la cabecera.
- **Barra de abajo** (`MobileNav`): Tablón, Encargos (con el aviso rojo de los de hoy), Calendario ([../calendar/README.md](../calendar/README.md)), Mercader, Personaje y **Más**: seis columnas. Sustituye al pie con las teclas. En el calendario, el rombo de crear añade un bloque a la agenda y deslizar el dedo pasa de semana o de día.
- **Menú «Más»** (`MobileMenu`): objetos, crónica, idioma, música (con el volumen), sonido y Google Drive. Reutiliza los mismos controles que la cabecera; su CSS despliega quietos los paneles que en el escritorio salen al pasar el ratón.
- **Rombo de crear** (`MobileCreate`): dorado, girado 45° como las gemas. Crea una quest en el tablón o un encargo en el de encargos.
- **Avisos** encima de la barra (`.m-toast`), para que se vean también con el detalle cerrado. El del detalle y el del tablón de madera se esconden.

### El detalle, una hoja a pantalla completa

En el escritorio el detalle está siempre al lado del tablón. En el teléfono es una **hoja que entra por la derecha** (`.m-sheet`) con «‹ Volver al tablón». `App.tsx` envuelve `QuestDetail` en `.m-sheet`, que en el escritorio tiene `display: contents` (no cuenta en la rejilla).

El estado guarda **el id de la quest abierta** (`useMobileUi.detail`), no un sí o no: si esa quest deja el tablón (completada, retirada, otra pestaña o plazo), `App` cierra la hoja en lugar de enseñar otra quest.

**Aceptar cierra antes la hoja.** El sello «EN CURSO» y las grietas se ponen sobre la **tarjeta** del tablón. Con la hoja delante no se verían. `detailPrimaryAction` cierra la hoja, espera `SHEET_MS` (lo que tarda en salir) y entonces acepta: el sello cae delante de ti. Reportar no lo necesita, porque «Quest Clear» ya ocupa toda la pantalla.

### Ventanas a pantalla completa

Todas las ventanas usan `.modal`, así que una regla las pone a pantalla completa (`mobile.css`). Cada funcionalidad recoloca lo suyo en su CSS:

| Ventana | En el teléfono |
|---|---|
| Crear quest y encargo | Una columna; las filas de tres campos, dos arriba y el tercero a lo ancho |
| Mercader | Hu Tao arriba, la mercancía debajo y la ficha de la pieza elegida **pegada abajo** (`position: sticky`) |
| Personaje | El muñeco entre dos columnas estrechas de ranuras y, debajo, los atributos. Al elegir una ranura, el armario ocupa la ventana |
| Objetos | Inventario como el mercader (ficha pegada abajo). Almanaque: las páginas una sobre otra y el índice asomando por arriba |
| Crónica | Una página cada vez; las flechas dentro del libro |
| Cartel de un encargo | Casi todo el ancho; los datos en una columna y los botones en dos filas |
| «Quest Clear», encargo cumplido y cartel clavado | Tamaños de letra y anchos a la medida de la pantalla |

### Pasar página deslizando el dedo

`useSwipe` (`swipe.ts`) pasa página en la crónica y en el almanaque al deslizar el dedo: 50 px como mínimo y más horizontal que vertical. Usa eventos de puntero, así que en el escritorio también vale arrastrando con el ratón. La zona lleva `.m-swipe` (`touch-action: pan-y`) para que el navegador no se quede el gesto.

### Detalles de iOS

- Los campos van a **16 px** como mínimo: con menos, iOS amplía la página al tocarlos.
- `touch-action: manipulation` (sin la espera del doble toque), sin el resaltado gris al tocar y sin el rebote de la página.
- El WebView de Tauri ya deja libres la isla dinámica y la barra de inicio: no hace falta `env(safe-area-inset-*)`.

### Fallo encontrado de paso: el clic que se perdía al cerrar una ventana

Al cerrar el mercader, el personaje u otra ventana, su fondo (ya invisible) se quedaba encima **hasta 1,4 s**, mientras terminaban las animaciones de dentro, y se tragaba el clic siguiente. En el teléfono se notaba en el primer toque en la barra. Ahora el fondo deja de recibir clics en cuanto empieza a irse (`BACKDROP_EXIT` en `src/lib/motion.ts`), y la ventana sale con una duración fija (`MODAL_EXIT`). También mejora el escritorio.

---

## Archivos

```
src/features/mobile/
├── README.md
├── index.ts              API pública
├── phone.ts              PHONE_MAX_WIDTH, isPhone(), useIsPhone()
├── ui.ts                 Store de UI: detalle abierto (id) y menú «Más»
├── actions.ts            detailPrimaryAction (aceptar cierra antes la hoja)
├── actions.test.ts
├── swipe.ts              useSwipe: pasar página deslizando el dedo
├── i18n.ts               Textos es + ja
├── mobile.css            Armazón y ajustes de app.css en el teléfono
└── components/
    ├── MobileNav.tsx     Barra de abajo y rombo de crear (MobileCreate)
    ├── MobileMenu.tsx    Menú «Más»
    ├── DetailBack.tsx    «‹ Volver al tablón»
    └── KeyHint.tsx       «Pulsa Enter…» o «Toca…» según la pantalla
```

## Puntos de integración

| Archivo | Cambio |
|---|---|
| `src/App.tsx` | `.m-sheet` + `DetailBack` alrededor de `QuestDetail`; `MobileNav`, `MobileCreate`, `MobileMenu` y el aviso `.m-toast`; abrir el detalle al tocar una tarjeta; clase `m-detail` |
| `src/components/QuestDetail.tsx` | El botón principal llama a `detailPrimaryAction`; `Toast` exportado |
| `src/components/Header.tsx` | `LangSwitch` exportado (lo usa el menú) |
| `src/components/ClearOverlay.tsx`, `temporal/components/{ClearedOverlay,PostedOverlay}.tsx` | `KeyHint` |
| `src/features/items/components/{LootChest,AlmanacBook}.tsx` | «Toca el cofre…»; deslizar para pasar página |
| `src/features/temporal/components/{Poster,TemporalBoard}.tsx` | Un toque abre el cartel; pista del tablón vacío |
| `src/features/chronicle/components/ChronicleModal.tsx` | Una página cada vez (`per`); deslizar |
| `src/features/equipment/components/CharacterModal.tsx` | Clase `is-picking` (el armario ocupa la ventana) |
| Las seis ventanas | `BACKDROP_EXIT` / `MODAL_EXIT` (`src/lib/motion.ts`) |
| CSS de `temporal`, `horizon`, `merchant`, `equipment`, `items`, `chronicle` | Un bloque `@media (max-width: 760px)` al final |
| `src/i18n/locales/{es,ja}.ts` | `mobile: mobileEs` / `mobileJa`; `chronicle.page` |

---

## Compilar y probarlo

```bash
rustup target add aarch64-apple-ios aarch64-apple-ios-sim   # una vez
pnpm tauri ios build --debug --target aarch64-sim           # app para el simulador
pnpm tauri ios dev                                          # en el simulador o el iPhone, con recarga en caliente
pnpm tauri ios build --export-method debugging              # release firmada para el iPhone (Quests.ipa)
```

Para el diseño, lo más rápido es `pnpm dev` en el navegador con la ventana a **402 × 874** (un iPhone 17): es el mismo CSS. El simulador hace falta para lo nativo (SQLite, el llavero y el inicio de sesión de Google) y para los toques de verdad. Ver «iPhone» en [../../../docs/AGENTES.md](../../../docs/AGENTES.md) para instalarla en el teléfono.

## Verificación

- **Tests** (`actions.test.ts`): aceptar en el teléfono cierra la hoja y no acepta hasta que ha salido (un error introducido, quitar la espera, lo detecta); en el escritorio acepta en el acto; reportar no cierra la hoja; con otra quest abierta no espera.
- **Navegador a 402 × 874**, en español: tablón, detalle, aceptar (sello sobre la tarjeta), progreso, reportar con «Quest Clear», «Level Up!» y el cofre (un épico), menú «Más», encargos (formulario, cartel clavado, cartel abierto, encargo cumplido), mercader (elegir pieza), personaje y armario, objetos, almanaque, crónica (deslizar con eventos de puntero) y crear quest. Escritorio a 1.280 × 780: igual que antes.
- **Simulador de iOS 27 (iPhone 17)**, en japonés: arranca, crea la base de datos y la conserva al reinstalar; tocar una tarjeta abre la hoja; aceptar cierra la hoja y el sello cae sobre la tarjeta; el menú «Más» abre.
- **iPhone 15 Pro Max de verdad**: la versión release (17 MB, *bundle ID* `com.requenadonacarlos.quests`) compila, se firma con el Apple ID gratuito y se instala. No se ha abierto todavía: falta confiar en el certificado en el iPhone. Las trampas de Xcode 27 que hubo que resolver están en `docs/AGENTES.md`, «iPhone».
- **Sin probar**: la app abierta en el iPhone; el sonido y la música en iOS (el interruptor de silencio del iPhone puede callar los efectos); los PDF adjuntos (iOS puede enseñar solo la primera página en el visor); el teclado de iOS encima de los formularios; el giro a horizontal; el iPad.
