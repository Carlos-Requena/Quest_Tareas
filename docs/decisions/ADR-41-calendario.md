---
adr: ADR-41
titulo: Calendario como tercera sección
estado: ampliada
por: [ADR-46, ADR-49]
fecha: 2026-10-03
funcionalidades: [calendar]
---

# ADR-41 · Calendario como tercera sección

- **Estado:** Ampliada por [ADR-46](ADR-46-mi-dia.md) y [ADR-49](ADR-49-menu-de-opciones.md). El calendario tiene tres vistas desde ADR-46 (Mi día · Semana · Día) y la barra del teléfono pasó de seis botones a cuatro con el menú de opciones (ADR-49).
- **Registrada:** 2026-10-03 (cuando entró en el informe técnico)
- **Ámbito:** [calendar](../../src/features/calendar/README.md)

## Decisión

Calendario como tercera sección (`Section` «calendar», tecla `S`) con dos vistas, semana y día por horas, calculadas sin eventos; las quests salen por su propia fecha límite y las de un encargo, con su encargo

## Alternativas descartadas

Una ventana como el mercader; dos secciones separadas; repetir cada quest de un encargo en su día; abrir la app en el calendario

## Motivo

El propietario quiere ver la semana y un calendario por horas, pero que la app abra en el Quest Board; una sección tiene sitio y teclado propios; sin duplicados en el día

## Consecuencias

La barra del teléfono pasa a seis botones; los plazos (`H`) quedan solo en los tablones
