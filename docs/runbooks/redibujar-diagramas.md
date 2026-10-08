# Redibujar los diagramas

Los diagramas de [INFORME-TECNICO.md](../INFORME-TECNICO.md) son capturas (`docs/img/`) de widgets del informe publicado en Claude Docs, que es donde se editan. **El texto del informe vive en el repositorio**; el documento publicado es una instantánea para leer con los diagramas editables.

| Diagrama | Archivo | Se redibuja cuando cambia… |
|---|---|---|
| Diagrama de clases | `docs/img/diagrama-clases.png` | Un tipo de `src/domain/types.ts`, un `model.ts`, `GameState`, `PlayerState` o la unión de eventos (**norma**: en la misma tarea) |
| Arquitectura por capas | `docs/img/arquitectura.png` | Las capas o los procesos (frontend, Rust, sync) |
| Ciclo de vida de una quest | `docs/img/ciclo-de-vida-quest.png` | Los estados de una quest o sus transiciones |
| Hoja de ruta | `docs/img/hoja-de-ruta.png` | Las fases o sus puertas |

## Responsabilidades

La actualización del diagrama de clases está reservada al agente Copilot asignado. Claude **no debe modificar** el widget del diagrama en Claude Docs ni `docs/img/diagrama-clases.png`. Cuando cambie el modelo, Claude entrega el inventario siguiente en su resumen de trabajo; no copia ni reescribe el diagrama.

Los estados posibles son:

- `NO CAMBIOS`: la tarea no cambió el modelo.
- `PENDIENTE`: hay cambios de modelo y el diagrama queda para Copilot.
- `ACTUALIZADO`: Copilot revisó el modelo, actualizó el diagrama y sustituyó la captura.

### Plantilla de entrega

```md
## Diagrama de clases

- Estado: PENDIENTE — reservado para Copilot
- Motivo: cambio del modelo de datos

### Cambios del modelo

#### Añadido
- `CharacterStyle` en `src/features/living/model.ts`

#### Modificado
- `PlayerState.companion` en `src/domain/types.ts`

#### Eliminado
- Ninguno

#### Eventos nuevos
- `companion_chosen`
- `companion_line_added`

#### Eventos modificados
- Ninguno

### Archivos relevantes

- `src/domain/types.ts`
- `src/features/living/model.ts`
- `src/features/companion/events.ts`

### Relaciones que revisar

- `PlayerState` → `CharacterStyle`
- `GameState` → `PlayerState`
```

## Procedimiento

1. Comprueba el inventario entregado por Claude contra el código real y concreta las clases, atributos y relaciones que han cambiado.
2. El informe publicado es el documento `1cb3618f-d1e6-483e-a198-a1998279827b` ([enlace](https://claude.ai/code/artifact/1cb3618f-d1e6-483e-a198-a1998279827b)). El diagrama de clases es el widget del nodo `894ac162-3228`; los otros se encuentran en el esquema del documento. Léelo con las herramientas de Docs (antes, su guía `topic.diagram`).
3. Cambia solo lo necesario con `draft-edit`, **conservando los `data-claude-text-id` de las etiquetas** (los comentarios cuelgan de ellos).
4. Haz una captura (`screenshot`) para revisar que nada se cruce ni se corte, y después `publish`.
5. Copia esa captura a su archivo de `docs/img/`.
6. Actualiza el texto que acompaña al diagrama en [INFORME-TECNICO.md](../INFORME-TECNICO.md#diagrama-de-clases). El texto del documento publicado no hace falta tocarlo: lleva un aviso de que la fuente es el repositorio.

Si no tienes acceso a las herramientas de Docs, dilo al propietario en lugar de dejar el diagrama desfasado: una nota del tipo «el diagrama aún no incluye X» no vale.
