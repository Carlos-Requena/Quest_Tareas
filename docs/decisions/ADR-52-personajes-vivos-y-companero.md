---
adr: ADR-52
titulo: Personajes vivos con una malla de WebGL y un compañero en Mi día, con su estilo y sus frases como eventos
estado: aceptada
fecha: 2026-10-08
funcionalidades: [living, companion, menu, customize, today]
---

# ADR-52 · Personajes vivos con una malla de WebGL y un compañero en Mi día, con su estilo y sus frases como eventos

- **Estado:** Aceptada.
- **Registrada:** 2026-10-08
- **Ámbito:** [living](../../src/features/living/README.md) · [companion](../../src/features/companion/README.md) · [menu](../../src/features/menu/README.md) · [customize](../../src/features/customize/README.md) · [today](../../src/features/today/README.md)

## Decisión

Los personajes del menú se animan **en el navegador, sobre la imagen que ya hay**: un shader de WebGL desplaza sus píxeles por zonas (respiración, balanceo, viento), con capas de CSS para el aura, el barrido de luz y las partículas, y una línea de tiempo de GSAP para la entrada gacha (`features/living`). Para animarlos de verdad, el jugador puede subir un **vídeo o una imagen animada**, que se guarda tal cual en el almacén de binarios (`CharacterArt.animated`) y se pinta sin malla. Cómo se mueve cada personaje es un **parche** sobre unos valores por defecto (`character_style_set`, `character_style_reset`).

Un **compañero** comenta el día en Mi día (`features/companion`): la situación sale del plan de Mi día; las frases por situación y quién acompaña son eventos (`companion_line_*`, `companion_chosen`). Las dos cosas se editan en la ventana de personalización, como pestañas del personaje ([ADR-51](ADR-51-personalizacion.md)).

## Alternativas descartadas

Generar fotogramas nuevos (parpadeo, gestos) con un modelo de imagen: la app no lleva ninguno, y la CSP no deja llamar a servicios de fuera desde el JavaScript. Live2D o un esqueleto por capas: exige preparar cada personaje a mano y añade una biblioteca grande; las capas quedan como mejora posible. Canvas 2D: no deforma una imagen por zonas a 60 fps. Guardar el estilo entero en cada cambio: dos equipos que tocan cosas distintas se pisarían, y los valores por defecto quedarían congelados en los datos. Las frases del compañero como `VoiceLine` del menú con «situaciones» en el campo de la parte del día: mezcla dos significados en un mismo campo.

## Motivo

El propietario quiere su estilo de personajes, con sus imágenes y vivos, sin depender de nadie más para animarlos, y que lo que personalice se vea igual en todos sus equipos. Un shader pequeño lo consigue con cualquier imagen ya subida (también con los de serie), y el vídeo cubre lo que el código no puede inventar.

## Consecuencias

`PROJECTION_VERSION` pasa a 13 (el acumulador gana `styles` y `companion`; 53 tipos de evento). Quitar un personaje se lleva su estilo y sus frases de compañero. Un vídeo o una imagen animada puede pesar hasta 30 MB en el almacén y en Drive. La malla usa un contexto de WebGL por personaje en pantalla (el menú y la vista previa), que se devuelve al cerrarse; sin WebGL, con «reducir movimiento» o con un vídeo, se usa la animación de CSS.
