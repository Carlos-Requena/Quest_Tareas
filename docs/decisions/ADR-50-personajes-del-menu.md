---
adr: ADR-50
titulo: Personajes del menú: de serie en public/ y añadidos con eventos
estado: aceptada
fecha: 2026-10-07
funcionalidades: [menu]
---

# ADR-50 · Personajes del menú: de serie en public/ y añadidos con eventos

- **Estado:** Aceptada.
- **Registrada:** 2026-10-07 (cuando entró en el informe técnico)
- **Ámbito:** [menu](../../src/features/menu/README.md)

## Decisión

Personajes del menú: los de serie son los `.webp` de `public/menu/` (un plugin de Vite los lista como `virtual:menu-characters`); los que añade el jugador son eventos (`character_added`, `character_removed`) con la imagen en el almacén de binarios; rotan cada día en vueltas barajadas con su número como semilla (sin repetir hasta que salen todos); elegir otro para hoy se guarda solo en el equipo y no cambia la rotación

## Alternativas descartadas

Personajes solo en el equipo (sin eventos); guardar el historial de la rotación; elegir para hoy como evento; `import.meta.glob` en una carpeta de `src/`

## Motivo

El propietario quiere que lleguen a todos sus equipos; calcular la rotación da el mismo personaje en todos sin guardar nada; los recursos van en `public/` (norma) y el propietario ya deja ahí los archivos

## Consecuencias

`PROJECTION_VERSION` pasa a 11 (42 tipos); añadir o quitar un personaje vuelve a barajar la rotación desde ese día; quitar no se deshace (la imagen se borra); otro equipo puede ver la miniatura antes que la imagen
