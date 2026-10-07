---
adr: ADR-31
titulo: iPhone con la misma app de Tauri e interfaz de teléfono en CSS
estado: ampliada
por: [ADR-49]
fecha: 2026-10-02
funcionalidades: [mobile]
---

# ADR-31 · iPhone con la misma app de Tauri e interfaz de teléfono en CSS

- **Estado:** Ampliada por [ADR-49](ADR-49-menu-de-opciones.md). El menú «Más» del teléfono ya no existe: lo sustituye el menú de opciones (ADR-49), y la barra de abajo tiene cuatro botones.
- **Registrada:** 2026-10-02 (cuando entró en el informe técnico)
- **Ámbito:** [mobile](../../src/features/mobile/README.md)

## Decisión

iPhone con la misma app de Tauri y una interfaz de teléfono hecha con CSS (`@media (max-width: 760px)` en cada funcionalidad) y un armazón propio (`features/mobile`: barra de abajo, menú «Más», detalle a pantalla completa)

## Alternativas descartadas

Una app móvil aparte (Swift o React Native); una PWA; reducir el teléfono al día a día

## Motivo

El dominio, los eventos, SQLite y la sincronización se reutilizan sin tocar; una PWA no podría guardar el token en el llavero ni hablar con Drive sin abrir la CSP. El propietario quería todo, como en el Mac

## Consecuencias

Cada pantalla nueva necesita su bloque de teléfono; el JavaScript solo distingue el teléfono donde el CSS no basta (`isPhone()`)
