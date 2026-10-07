---
adr: ADR-28
titulo: OAuth y llamadas a Drive desde Rust, con el token en el llavero
estado: aceptada
fecha: 2026-10-02
funcionalidades: [sync]
---

# ADR-28 · OAuth y llamadas a Drive desde Rust, con el token en el llavero

- **Estado:** Aceptada.
- **Registrada:** 2026-10-02 (cuando entró en el informe técnico)
- **Ámbito:** [sync](../../src/features/sync/README.md)

## Decisión

Rust hace el inicio de sesión (PKCE con redirección a 127.0.0.1) y todas las llamadas a Drive; refresh token en el llavero; el JavaScript solo pide listar, bajar y subir

## Alternativas descartadas

fetch desde el JavaScript con el token; token en SQLite o en un archivo

## Motivo

El token nunca llega al WebView ni al disco en claro, y la CSP no tiene que abrirse a Google

## Consecuencias

Comandos nativos que mantener; se prueba la lógica con un Drive falso, y lo nativo solo a mano
