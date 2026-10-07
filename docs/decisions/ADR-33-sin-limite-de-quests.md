---
adr: ADR-33
titulo: Sin límite de quests en curso
estado: aceptada
fecha: 2026-10-02
funcionalidades: []
---

# ADR-33 · Sin límite de quests en curso

- **Estado:** Aceptada.
- **Registrada:** 2026-10-02 (cuando entró en el informe técnico)
- **Ámbito:** Transversal

## Decisión

Sin límite de quests en curso: se quitan los huecos (`maxActive`, 4 al empezar y uno más cada 3 niveles, hasta 10)

## Alternativas descartadas

Subir el límite; dejarlo como opción

## Motivo

El propietario: «no tiene sentido» para tareas reales. Ninguna guarda de la proyección dependía de él (solo la acción al aceptar), así que no cambia ningún evento ni el snapshot

## Consecuencias

`PlayerState.maxActive` desaparece (diagrama de clases redibujado); la cabecera solo cuenta las quests en curso
