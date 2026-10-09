# Decisiones de arquitectura (ADR)

Una decisión por archivo: qué se decidió, qué se descartó, por qué y qué consecuencias tiene. Sirve para no reabrir una decisión sin un motivo nuevo. El diseño de detalle de cada funcionalidad está en su README; aquí van las decisiones que cruzan la arquitectura o que el propietario fijó.

**Estados:** *aceptada* (vigente) · *ampliada* (vigente, pero otra ADR la completa o cambia una parte; el archivo dice cuál y qué) · *sustituida* (ya no vale; manda la que la sustituye). El texto de una ADR no se reescribe: si algo cambia, se añade otra y se actualiza el estado de la antigua.

## Índice

<!-- generado:adr -->
> Esta tabla se genera con `pnpm docs:index`. No editar manualmente: los cambios se pierden al regenerarla.

| ADR | Decisión | Estado | Funcionalidades | Registrada |
|---|---|---|---|---|
| [ADR-01](ADR-01-tauri.md) | Tauri 2 como contenedor | aceptada | — | 2026-10-02 |
| [ADR-02](ADR-02-event-sourcing.md) | Event sourcing en lugar de guardar estado | aceptada | — | 2026-10-02 |
| [ADR-03](ADR-03-local-first.md) | SQLite local como fuente de verdad (local-first) | aceptada | — | 2026-10-02 |
| [ADR-04](ADR-04-drive-un-archivo-por-equipo.md) | Google Drive como canal de sincronización, un archivo por equipo | aceptada | sync | 2026-10-02 |
| [ADR-05](ADR-05-zustand.md) | Zustand para el estado | aceptada | — | 2026-10-02 |
| [ADR-06](ADR-06-motion-y-gsap.md) | Motion para transiciones y GSAP para secuencias | aceptada | — | 2026-10-02 |
| [ADR-07](ADR-07-sonido-sintetizado.md) | Sonido sintetizado con Web Audio | aceptada | — | 2026-10-02 |
| [ADR-08](ADR-08-fuentes-locales.md) | Fuentes locales con Fontsource, solo el subconjunto latino | aceptada | — | 2026-10-02 |
| [ADR-09](ADR-09-drops-en-el-evento.md) | Drops tirados en la acción y guardados en quest_completed | aceptada | items | 2026-10-02 |
| [ADR-10](ADR-10-imagen-en-el-evento.md) | Imagen de los objetos reducida dentro del evento | aceptada | items, merchant | 2026-10-02 |
| [ADR-11](ADR-11-almacen-de-binarios.md) | Adjuntos en un almacén de binarios por SHA-256 | ampliada por ADR-29 | temporal, merchant, menu, sync | 2026-10-02 |
| [ADR-12](ADR-12-encargos-entidad-propia.md) | Encargos temporales como entidad y tablón propios | aceptada | temporal | 2026-10-02 |
| [ADR-13](ADR-13-repeticion-y-requisitos.md) | Repetición y requisitos como campos opcionales de QuestDef | ampliada por ADR-42 | complex | 2026-10-02 |
| [ADR-14](ADR-14-quests-enlazadas.md) | Quests enlazadas a un encargo con eventos delta | aceptada | temporal | 2026-10-02 |
| [ADR-15](ADR-15-plazos-calculados.md) | Plazos calculados con la hora actual | aceptada | horizon | 2026-10-02 |
| [ADR-16](ADR-16-snapshot.md) | Snapshot del acumulador de la proyección | aceptada | snapshot | 2026-10-02 |
| [ADR-17](ADR-17-ts-ultimo-mas-un-ms.md) | ts de un evento nuevo: último aplicado + 1 ms | sustituida por ADR-25 | snapshot | 2026-10-02 |
| [ADR-18](ADR-18-mercader-precio-calculado.md) | Mercader con catálogo propio y precio calculado | aceptada | merchant | 2026-10-02 |
| [ADR-19](ADR-19-escaparate-semanal.md) | Escaparate semanal calculado con la semana como semilla | aceptada | merchant | 2026-10-02 |
| [ADR-20](ADR-20-atributos-calculados.md) | Atributos calculados de quest_completed y muñeco en SVG | aceptada | attributes, equipment | 2026-10-02 |
| [ADR-21](ADR-21-piezas-de-serie-en-codigo.md) | Piezas de serie en el código, fuera de los eventos | aceptada | armory | 2026-10-02 |
| [ADR-22](ADR-22-rachas-y-cronica-calculadas.md) | Rachas y crónica calculadas en la proyección | aceptada | streaks, chronicle | 2026-10-02 |
| [ADR-23](ADR-23-listas-y-areas-conocidas.md) | Objetivo de tipo lista y áreas conocidas que se traducen | aceptada | checklist, attributes | 2026-10-02 |
| [ADR-24](ADR-24-eventos-versionados.md) | Versión en cada evento con conversión paso a paso | aceptada | — | 2026-10-02 |
| [ADR-25](ADR-25-reloj-hibrido.md) | Reloj lógico híbrido dentro de ts | aceptada | snapshot, sync | 2026-10-02 |
| [ADR-26](ADR-26-csp-estricta.md) | CSP estricta | ampliada por ADR-28 | — | 2026-10-02 |
| [ADR-27](ADR-27-error-boundary.md) | Error boundary en la raíz con pantalla de recuperación | aceptada | recovery | 2026-10-02 |
| [ADR-28](ADR-28-oauth-y-drive-en-rust.md) | OAuth y llamadas a Drive desde Rust, con el token en el llavero | aceptada | sync | 2026-10-02 |
| [ADR-29](ADR-29-jsonl-por-equipo.md) | Un JSONL por equipo y binarios por SHA-256 en Drive | aceptada | sync | 2026-10-02 |
| [ADR-30](ADR-30-ids-fijos-y-lapida.md) | Datos de ejemplo con ids fijos y lápida de las quests retiradas | aceptada | sync | 2026-10-02 |
| [ADR-31](ADR-31-iphone-con-tauri.md) | iPhone con la misma app de Tauri e interfaz de teléfono en CSS | ampliada por ADR-49 | mobile | 2026-10-02 |
| [ADR-32](ADR-32-login-google-ios.md) | Inicio de sesión de Google en iOS con ASWebAuthenticationSession | aceptada | sync | 2026-10-02 |
| [ADR-33](ADR-33-sin-limite-de-quests.md) | Sin límite de quests en curso | aceptada | — | 2026-10-02 |
| [ADR-34](ADR-34-release-ios-xcode-27.md) | Compilación release para iOS con Xcode 27 | aceptada | mobile | 2026-10-03 |
| [ADR-35](ADR-35-recompensa-calculada.md) | Recompensa calculada por objetivos y categoría | aceptada | rewards | 2026-10-03 |
| [ADR-36](ADR-36-coleccionables-unicos.md) | Coleccionables únicos y uno a la venta cada semana | aceptada | collectibles, items | 2026-10-03 |
| [ADR-37](ADR-37-almanaque-por-tipo.md) | Un almanaque por tipo de objeto | aceptada | items | 2026-10-03 |
| [ADR-38](ADR-38-encargos-aceptados.md) | Encargos aceptados o sin aceptar, con quests en reserva | aceptada | temporal | 2026-10-03 |
| [ADR-39](ADR-39-contactos.md) | Contactos escritos a mano y abiertos con tauri-plugin-opener | ampliada por ADR-42 | contacts | 2026-10-03 |
| [ADR-40](ADR-40-agenda.md) | Agenda personal con eventos propios | aceptada | agenda | 2026-10-03 |
| [ADR-41](ADR-41-calendario.md) | Calendario como tercera sección | ampliada por ADR-46, ADR-49 | calendar | 2026-10-03 |
| [ADR-42](ADR-42-editar-quests.md) | Editar quests con quest_updated | aceptada | editing | 2026-10-06 |
| [ADR-43](ADR-43-deshacer.md) | Deshacer como otro evento | aceptada | undo | 2026-10-06 |
| [ADR-44](ADR-44-fallos.md) | Fallos como eventos al acabar el día de la fecha | aceptada | failure | 2026-10-06 |
| [ADR-45](ADR-45-repeticion-por-dias.md) | Repetición por días de la semana | aceptada | complex | 2026-10-06 |
| [ADR-46](ADR-46-mi-dia.md) | El calendario como sitio de planificación, con Mi día | aceptada | today, calendar | 2026-10-06 |
| [ADR-47](ADR-47-avisos-del-sistema.md) | Avisos del sistema con tauri-plugin-notification | aceptada | notifications | 2026-10-06 |
| [ADR-48](ADR-48-alta-rapida-y-busqueda.md) | Alta rápida de una línea y búsqueda sin tildes | aceptada | quickadd, search | 2026-10-06 |
| [ADR-49](ADR-49-menu-de-opciones.md) | Menú de opciones al estilo del menú principal de un gacha | aceptada | menu, mobile | 2026-10-07 |
| [ADR-50](ADR-50-personajes-del-menu.md) | Personajes del menú: de serie en public/ y añadidos con eventos | aceptada | menu | 2026-10-07 |
| [ADR-51](ADR-51-personalizacion.md) | Personalización: una ventana que solo presenta; cada dato, en su funcionalidad | aceptada | customize, menu, temporal | 2026-10-08 |
| [ADR-52](ADR-52-personajes-vivos-y-companero.md) | Personajes vivos con una malla de WebGL y un compañero en Mi día, con su estilo y sus frases como eventos | aceptada | living, companion, menu, customize, today | 2026-10-08 |
| [ADR-53](ADR-53-gestos-y-vibracion-en-el-telefono.md) | Gestos de iOS hechos en la web y vibración con el plugin haptics de Tauri | aceptada | mobile, quickadd, menu, merchant, items | 2026-10-09 |
<!-- /generado:adr -->

## Añadir una ADR

1. Copia el último archivo como `ADR-NN-<tema-corto>.md`, con el número siguiente.
2. Rellena el frontmatter (`adr`, `titulo`, `estado: aceptada`, `fecha`, `funcionalidades`) y las cuatro secciones: **Decisión**, **Alternativas descartadas**, **Motivo** y **Consecuencias**.
3. Si cambia una anterior, pon en ella `estado: ampliada` o `sustituida`, `por: [ADR-NN]` y una frase en «Estado» con lo que cambia.
4. Añade el número al `adr:` del README de cada funcionalidad afectada y ejecuta `pnpm docs:index` (regenera este índice).
