# Crear una funcionalidad nueva

Cada funcionalidad vive en su carpeta, `src/features/<nombre>/`, con su README ([AGENTES §6](../AGENTES.md#6-norma-una-carpeta-por-funcionalidad)).

## Pasos

1. **Rama**: `git switch -c feature/<nombre>` desde `main` actualizada.
2. **Carpeta y README**: crea `src/features/<nombre>/README.md` copiando el esqueleto de [la plantilla](../templates/feature-readme.md), y `docs/history/verificacion/<nombre>.md` (vacío salvo el título). Rellena el frontmatter desde el principio: `pnpm docs:check` te irá diciendo qué falta.
3. **Modelo puro** (`model.ts`): tipos y funciones puras, sin React, Zustand, Tauri, `Date.now()` ni `Math.random()`.
4. **Eventos** (`events.ts`), si los necesita: [migrar-evento.md](migrar-evento.md).
5. **Acciones** (`actions.ts`): validan y llaman a `dispatch`. **Estado de interfaz** propio en `ui.ts` (Zustand), no en `src/store/game.ts`; si tiene ventana, exporta un `<nombre>Busy()` para que los teclados de las secciones esperen.
6. **Textos** (`i18n.ts`): `<nombre>Es` y `<nombre>Ja` (tipado `typeof <nombre>Es`), montados en `src/i18n/locales/{es,ja}.ts`.
7. **Componentes y estilos**, con su bloque `@media (max-width: 760px)` al final del CSS. Una ventana nueva se abre desde una tarjeta del [menú de opciones](../../src/features/menu/README.md).
8. **Integración mínima** fuera de la carpeta (tipos, unión de eventos, proyección, diccionarios y el componente que la aloja), enumerada en «Integración».
9. **Tests** (`*.test.ts` junto al módulo) y verificación en ejecución ([verificar-ui.md](verificar-ui.md)).
10. **Documentación**: README completo, una ADR si es una decisión de arquitectura ([decisions/](../decisions/README.md)), `pnpm docs:index` y, si cambia el modelo, [el diagrama de clases](redibujar-diagramas.md).

## Ejemplos de cada tipo

| Si se parece a… | Mira |
|---|---|
| Una regla del juego con eventos propios | [pomodoro](../../src/features/pomodoro/README.md) (con datos antiguos convertidos) |
| Entidades propias, azar e imágenes | [items](../../src/features/items/README.md) |
| Una sección propia con estado de interfaz y archivos adjuntos | [temporal](../../src/features/temporal/README.md) |
| Campos opcionales de `QuestDef` y reglas puras, sin eventos | [complex](../../src/features/complex/README.md), [horizon](../../src/features/horizon/README.md) |
| Economía: precios calculados y un gasto que vigila la proyección | [merchant](../../src/features/merchant/README.md) |
| Algo que se calcula de los eventos de otra | [attributes](../../src/features/attributes/README.md), [streaks](../../src/features/streaks/README.md) |
| Un registro que apunta la proyección cuando un evento pasa sus guardas | [chronicle](../../src/features/chronicle/README.md) |
| Datos de serie en el código, fuera de los eventos | [armory](../../src/features/armory/README.md) |
| Un servicio local por equipo, sin eventos | [music](../../src/features/music/README.md), [notifications](../../src/features/notifications/README.md) |
| Infraestructura con tests de equivalencia | [snapshot](../../src/features/snapshot/README.md) |
| Parte nativa en Rust con un motor inyectado y probado con dobles | [sync](../../src/features/sync/README.md) |
| Presentación que adapta todas las pantallas | [mobile](../../src/features/mobile/README.md) |
| Una pantalla que aloja las de otras, con teclado en captura | [menu](../../src/features/menu/README.md) |

## Errores habituales

- Importar el `index.ts` de una funcionalidad desde el dominio (crea un ciclo con el store).
- Poner en `model.ts` lógica que usa la proyección (`effectiveStatus`): va en otro archivo (como `temporal/links.ts`).
- Guardar estado calculado en eventos, o preferencias de pantalla en eventos (van en `localStorage`, en el frontmatter `preferencias:`).
- Olvidar el evento nuevo en `randomStream`, la clave en `ja.ts` o el bloque de teléfono.
