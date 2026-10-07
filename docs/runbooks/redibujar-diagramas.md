# Redibujar los diagramas

Los diagramas de [INFORME-TECNICO.md](../INFORME-TECNICO.md) son capturas (`docs/img/`) de widgets del informe publicado en Claude Docs, que es donde se editan. **El texto del informe vive en el repositorio**; el documento publicado es una instantánea para leer con los diagramas editables.

| Diagrama | Archivo | Se redibuja cuando cambia… |
|---|---|---|
| Diagrama de clases | `docs/img/diagrama-clases.png` | Un tipo de `src/domain/types.ts`, un `model.ts`, `GameState`, `PlayerState` o la unión de eventos (**norma**: en la misma tarea) |
| Arquitectura por capas | `docs/img/arquitectura.png` | Las capas o los procesos (frontend, Rust, sync) |
| Ciclo de vida de una quest | `docs/img/ciclo-de-vida-quest.png` | Los estados de una quest o sus transiciones |
| Hoja de ruta | `docs/img/hoja-de-ruta.png` | Las fases o sus puertas |

## Procedimiento

1. El informe publicado es el documento `1cb3618f-d1e6-483e-a198-a1998279827b` ([enlace](https://claude.ai/code/artifact/1cb3618f-d1e6-483e-a198-a1998279827b)). El diagrama de clases es el widget del nodo `894ac162-3228`; los otros se encuentran en el esquema del documento. Léelo con las herramientas de Docs (antes, su guía `topic.diagram`).
2. Cambia solo lo necesario con `draft-edit`, **conservando los `data-claude-text-id` de las etiquetas** (los comentarios cuelgan de ellos).
3. Haz una captura (`screenshot`) para revisar que nada se cruce ni se corte, y después `publish`.
4. Copia esa captura a su archivo de `docs/img/`.
5. Actualiza el texto que acompaña al diagrama en [INFORME-TECNICO.md](../INFORME-TECNICO.md#diagrama-de-clases). El texto del documento publicado no hace falta tocarlo: lleva un aviso de que la fuente es el repositorio.

Si no tienes acceso a las herramientas de Docs, dilo al propietario en lugar de dejar el diagrama desfasado: una nota del tipo «el diagrama aún no incluye X» no vale.
