---
adr: ADR-26
titulo: CSP estricta
estado: ampliada
por: [ADR-28]
fecha: 2026-10-02
funcionalidades: []
---

# ADR-26 · CSP estricta

- **Estado:** Ampliada por [ADR-28](ADR-28-oauth-y-drive-en-rust.md). La fase 2 no tuvo que abrir la CSP a Google: ADR-28 hace todas las llamadas desde Rust. La regla sigue: un origen nuevo se añade a mano y de forma mínima.
- **Registrada:** 2026-10-02 (cuando entró en el informe técnico)
- **Ámbito:** Transversal

## Decisión

CSP estricta: solo `'self'`, `data:` y `blob:` donde hace falta e IPC; sin *nonces* de Tauri en `style-src`

## Alternativas descartadas

`csp: null`; *nonces* también en los estilos

## Motivo

Cierra la carga de scripts y recursos de fuera; Motion, GSAP y React necesitan estilos en línea, que el *nonce* anularía

## Consecuencias

Cada origen nuevo (Google, en la fase 2) hay que añadirlo a mano; `'unsafe-inline'` en los estilos
