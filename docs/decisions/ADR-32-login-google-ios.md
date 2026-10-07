---
adr: ADR-32
titulo: Inicio de sesión de Google en iOS con ASWebAuthenticationSession
estado: aceptada
fecha: 2026-10-02
funcionalidades: [sync]
---

# ADR-32 · Inicio de sesión de Google en iOS con ASWebAuthenticationSession

- **Estado:** Aceptada.
- **Registrada:** 2026-10-02 (cuando entró en el informe técnico)
- **Ámbito:** [sync](../../src/features/sync/README.md)

## Decisión

Inicio de sesión de Google en iOS con un cliente «iOS» sin secreto y `ASWebAuthenticationSession` en un plugin propio (`src-tauri/plugins/web-auth`); el canje del código, en Rust

## Alternativas descartadas

Redirección a 127.0.0.1 (como en el escritorio); `tauri-plugin-deep-link` y Safari; el SDK de Google Sign-In

## Motivo

iOS no deja escuchar un puerto con Safari delante y Google no admite 127.0.0.1 en clientes iOS; con *deep links* el código pasaría por el JavaScript. El plugin son unas 60 líneas de Swift sin comandos para el WebView

## Consecuencias

Dos clientes de Google en el mismo proyecto (Drive reconoce la app por el proyecto); el *bundle ID* del cliente iOS tiene que ser el de la app
