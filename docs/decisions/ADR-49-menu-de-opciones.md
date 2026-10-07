---
adr: ADR-49
titulo: Menú de opciones al estilo del menú principal de un gacha
estado: aceptada
fecha: 2026-10-07
funcionalidades: [menu, mobile]
---

# ADR-49 · Menú de opciones al estilo del menú principal de un gacha

- **Estado:** Aceptada.
- **Registrada:** 2026-10-07 (cuando entró en el informe técnico)
- **Ámbito:** [menu](../../src/features/menu/README.md) · [mobile](../../src/features/mobile/README.md)

## Decisión

Menú de opciones (features/menu): la cabecera se queda con el tablón, el rango, la XP, el oro y la búsqueda; el mercader, el personaje, los objetos, la crónica, la búsqueda, las secciones y los ajustes van en una pantalla al estilo del menú principal de un gacha (Kazuma y tarjetas en 3D con rótulos en relieve), que entra con un barrido; las ventanas se abren encima y se vuelve al menú; en el teléfono, la barra pasa a cuatro botones y el menú sustituye al «Más»

## Alternativas descartadas

Un menú desplegable en la cabecera; otra ventana como el mercader; dejar los botones en la cabecera; rótulos traducidos en grande

## Motivo

El propietario: la interfaz «abruma» y pidió una pestaña de opciones con el estilo de Arknights y Kazuma; una pantalla deja sitio al personaje y a la profundidad, y es solo presentación (sin eventos ni cambios en el dominio)

## Consecuencias

Dos clics en lugar de uno para las ventanas (las teclas `I`, `C`, `P` y `J` siguen igual); el teclado del menú escucha en captura para no adelantarse a las ventanas; nada entre la rejilla y los textos puede aplanar el 3D; cada ventana nueva se añade como tarjeta del menú
