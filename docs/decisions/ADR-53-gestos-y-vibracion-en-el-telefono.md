---
adr: ADR-53
titulo: Gestos de iOS hechos en la web y vibración con el plugin haptics de Tauri
estado: aceptada
fecha: 2026-10-09
funcionalidades: [mobile, quickadd, menu, merchant, items]
---

# ADR-53 · Gestos de iOS hechos en la web y vibración con el plugin haptics de Tauri

- **Estado:** Aceptada.
- **Registrada:** 2026-10-09
- **Ámbito:** [mobile](../../src/features/mobile/README.md) · [quickadd](../../src/features/quickadd/README.md) · [menu](../../src/features/menu/README.md) · [merchant](../../src/features/merchant/README.md) · [items](../../src/features/items/README.md)

## Decisión

Los gestos que se esperan en un iPhone se hacen **en la web, con eventos de puntero**, con un único gesto (`useDragDismiss`, en `features/mobile/drag.ts`): volver del detalle deslizando desde el borde izquierdo, cerrar las hojas de abajo arrastrando su asa y deslizar una tarjeta del tablón para su acción principal. El elemento sigue al dedo y, al soltar, sale (pasó del umbral o fue un golpe rápido) o vuelve con un muelle. Lo que ya anima Motion o GSAP no se mueve desde el gesto: se arrastra una capa de fuera (las hojas) o solo se pinta el progreso (las tarjetas).

La **vibración** usa el plugin oficial `tauri-plugin-haptics` (impacto, resultado y selección; sin vibración libre). La llama `src/lib/sfx.ts` en cada efecto, antes de mirar el silencio, y tiene su propia preferencia en este equipo (`quests.haptics`). En el escritorio y en el navegador no hace nada.

## Alternativas descartadas

Una barra o unos gestos nativos de SwiftUI encima del WebView: lo nativo queda siempre por encima de la web (taparía ventanas, avisos y teclado) y habría dos interfaces que mantener; se valoró y se dejó para más adelante (el Liquid Glass literal). `navigator.vibrate`: WebKit en iOS no lo tiene. Una biblioteca de gestos: el caso es pequeño y el código propio respeta los `touch-action` y la convivencia con Motion y GSAP. Atar la vibración al silencio: quien quita el sonido en el iPhone suele querer seguir notando los toques.

## Motivo

El propietario quiere que la app del iPhone se use como una app de iPhone (volver con el borde, bajar las hojas, celebraciones que se noten) sin perder que la misma interfaz sirve en el Mac, en Windows y en el navegador.

## Consecuencias

Un plugin nativo más (`Cargo.toml`, `lib.rs`, tres permisos en `capabilities/default.json`); la CSP no cambia. La vibración solo se puede comprobar en un iPhone real (el simulador no vibra). Las hojas que anima Motion llevan una capa de fuera que las coloca (`.qa-sheet-pos`, `.mnp-sheet-pos`). En el teléfono no se puede ampliar la página (`user-scalable=no` y `touch-action: pan-x pan-y`), a costa de la ampliación del sistema para leer.
