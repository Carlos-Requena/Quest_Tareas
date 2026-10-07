# Plantilla: README de una funcionalidad

Cada carpeta `src/features/<nombre>/` lleva un `README.md` con esta forma. `pnpm docs:check` comprueba el frontmatter, las secciones obligatorias y su orden, que los eventos y las preferencias existan en el código, que cada funcionalidad que importa se explique en «Dependencias», que las rutas de «Integración» existan y que el historial esté enlazado. `pnpm docs:index` regenera con todo ello las tablas de [INDEX.md](../INDEX.md).

## Reglas de escritura

- **Solo lo vigente.** Nada de «antes…», «ahora…», «hasta que exista…» ni fechas de cuando se hizo algo: eso va a `docs/history/verificacion/<nombre>.md` o a [CHANGELOG-TECNICO.md](../history/CHANGELOG-TECNICO.md).
- **Sin cifras que caducan**: ni número de tests ni de líneas. Se dice qué archivos de test hay; cuántos, `pnpm test`.
- **Una sola fuente.** Lo que es de otra funcionalidad se enlaza, no se copia. Las normas generales están en [AGENTES.md](../AGENTES.md) y no se repiten («Sigue la convención del proyecto…» sobra).
- **Rutas completas desde la raíz** en «Integración» (`src/components/QuestCard.tsx`, no `QuestCard.tsx`).
- Secciones opcionales: **Modelo**, **Interfaz** y **Pendiente** (esta, solo con trabajo concreto que falta; nada de ideas vagas ni de lo que ya está en «Sin verificar»). Dentro de cada sección, los apartados que hagan falta con `###`.
- **Dónde está cada cosa** (apartado opcional de «Archivos»): en las funcionalidades con archivos grandes o flujos repartidos, una tabla corta *concepto → símbolo* para no tener que explorar. Cada símbolo enlaza a su archivo con ruta relativa, ``[`nombre`](components/Archivo.tsx)``, sin número de línea (caduca); `pnpm docs:check` comprueba que el nombre existe en ese archivo. Lo que no es un símbolo con nombre (un efecto, una suscripción) se describe en texto junto al símbolo que lo contiene.

## Esqueleto

Copia desde aquí (sin el bloque de código):

```markdown
---
funcionalidad: <nombre de la carpeta>
titulo: <Nombre legible>
resumen: <Una frase: qué hace para el jugador. Se copia en el índice.>
tipo: <dominio | presentación | servicio | infraestructura>
eventos: [<tipos de evento que declara su events.ts>]
preferencias: [<claves de localStorage que guarda por equipo>]
adr: [<ADR-NN que la afectan>]
---

# <Nombre legible>

<Uno o dos párrafos si el resumen no basta: cómo se llega (tecla, botón, menú) y qué ve el jugador.>

## Qué hace

<Comportamiento visible y lo que pidió el propietario. Una tabla R1, R2… si ayuda.>

## Reglas y decisiones

<Reglas vigentes, preferencias del propietario (con su porqué) y alternativas descartadas en una línea. Enlaza las ADR.>

## Modelo

<Tipos y funciones puras principales; un diagrama mermaid si aclara algo.>

## Eventos

| Evento | Datos | Efecto en la proyección | Guarda |
|---|---|---|---|

<O «No tiene eventos propios.» Después, la compatibilidad con datos antiguos y si sube PROJECTION_VERSION.>

## Interfaz

<Teclado, animaciones, sonido y ajustes del teléfono.>

## Archivos

| Archivo | Contenido |
|---|---|

### Dónde está cada cosa

| Concepto | Símbolo |
|---|---|
| <Qué hace el jugador o qué regla> | [`símbolo`](archivo.ts) |

## Integración

| Fuera de la carpeta | Cambio |
|---|---|

## Dependencias

- **features/<otra>** (`<archivo que importa>`): para qué. Si hace falta leer su README para tocar esto, dilo; si no, «no hace falta leerlo».
- **La usan:** <funcionalidades que la importan>.

## Estado actual

- **Última verificación:** AAAA-MM-DD, <cómo: tests, navegador a tal tamaño, app nativa…>.
- **Tests:** `<archivos>.test.ts`.
- **Sin verificar:** <lo que nadie ha probado todavía>.
- **Historial:** [docs/history/verificacion/<nombre>.md](../../../docs/history/verificacion/<nombre>.md).

## Pendiente

- <Posibles mejoras.>
```

## Tipos

| Tipo | Cuándo | Ejemplos |
|---|---|---|
| dominio | Añade reglas del juego: eventos, campos de `QuestDef` o cálculos que lee la proyección | `pomodoro`, `temporal`, `complex`, `rewards` |
| presentación | Solo interfaz sobre el estado: vistas, entrada de datos, armazón | `calendar`, `today`, `search`, `mobile`, `menu` |
| servicio | Un recurso local, por equipo, fuera de los eventos | `music`, `notifications` |
| infraestructura | Cómo se calcula, guarda o recupera el estado | `snapshot`, `sync`, `recovery` |
