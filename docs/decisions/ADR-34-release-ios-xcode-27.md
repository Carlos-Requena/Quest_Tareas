---
adr: ADR-34
titulo: Compilación release para iOS con Xcode 27
estado: aceptada
fecha: 2026-10-03
funcionalidades: [mobile]
---

# ADR-34 · Compilación release para iOS con Xcode 27

- **Estado:** Aceptada.
- **Registrada:** 2026-10-03 (cuando entró en el informe técnico)
- **Ámbito:** [mobile](../../src/features/mobile/README.md)

## Decisión

Compilación release para iOS con Xcode 27: `llvm-tools` de rustup, `swift_rs_globals()` en `build.rs` (hace globales las funciones de `SwiftRs.o`), PATH con rustup y sin sandbox en el script de Xcode, sin `strip` en las macros; *bundle ID* de iOS propio (`com.requenadonacarlos.quests`)

## Alternativas descartadas

Esperar a una versión nueva de swift-rs; un *fork* de swift-rs; desinstalar el Rust de Homebrew

## Motivo

swift-rs 1.0.8 deja sin exportar sus propias funciones y el enlace falla; los arreglos se limitan a iOS y no hacen nada si dejan de hacer falta; `com.quests.app` estaba registrado por otra cuenta de Apple

## Consecuencias

Si Tauri regenera el proyecto de Xcode, comprobar el sandbox y el PATH; el cliente iOS de Google tiene que usar el *bundle ID* nuevo
