# Compilar e instalar en el iPhone

La app de iPhone es el mismo proyecto de Tauri compilado para iOS (`src-tauri/gen/apple`). La interfaz de teléfono está en [features/mobile](../../src/features/mobile/README.md) y se diseña más rápido con `pnpm dev` a **402 × 874** ([verificar-ui.md](verificar-ui.md)); el simulador hace falta para lo nativo (SQLite, llavero, inicio de sesión de Google, avisos).

## Preparar el Mac (una vez)

```bash
rustup target add aarch64-apple-ios aarch64-apple-ios-sim
```

```bash
xcodebuild -downloadPlatform iOS
```

```bash
rustup component add llvm-tools
```

- **El simulador** son unos 8 GB.
- **Dos Rust en el Mac.** El de Homebrew (`/opt/homebrew/bin`) va antes en el PATH que el de rustup (`~/.cargo/bin`) y no compila para iOS («can't find crate for `std`»). Pon `~/.cargo/bin` delante (`export PATH="$HOME/.cargo/bin:$PATH"`) o desinstala el de Homebrew.
- **CocoaPods** hace falta para `tauri ios init`: `brew install cocoapods` (con `gem` pide `sudo`).
- **`llvm-tools`**: swift-rs lo necesita para hacer globales las funciones de Swift; sin él, «Undefined symbols» al enlazar.

## Compilar

```bash
pnpm tauri ios build --debug --target aarch64-sim    # app para el simulador
pnpm tauri ios dev                                   # simulador o iPhone, con recarga en caliente
pnpm tauri ios dev --open                            # lo mismo desde Xcode (para firmar e instalar)
pnpm tauri ios build --export-method debugging       # release firmada: src-tauri/gen/apple/build/arm64/Quests.ipa
```

Instalar el `.ipa` en un iPhone conectado: `xcrun devicectl device install app --device <UDID> <ipa>` (el UDID sale en `xcrun devicectl list devices`).

## Firmar con un Apple ID gratuito

1. Xcode → Settings → Accounts: añade el Apple ID.
2. Pon el *Team ID* en `bundle.iOS.developmentTeam` de `tauri.conf.json`.
3. Conecta el iPhone con el modo desarrollador activado y ejecuta `pnpm tauri ios dev --open` (o compila desde Xcode).
4. La primera vez, en el iPhone: Ajustes → General → VPN y gestión de dispositivos → confía en el certificado.

**Caduca a los 7 días**: hay que volver a instalarla desde Xcode. Los datos se conservan si no se borra la app.

El *bundle ID* de iOS es `com.requenadonacarlos.quests` (`src-tauri/tauri.ios.conf.json`), porque `com.quests.app` lo tenía registrado otra cuenta de Apple. El cliente iOS de Google tiene que usar el mismo ([verificar-sync.md](verificar-sync.md)).

## Arreglos para Xcode 27 (ya en el repositorio)

Por qué existen: [ADR-34](../decisions/ADR-34-release-ios-xcode-27.md).

- **swift-rs 1.0.8 no globaliza su propio módulo** (`retain_object`, `string_from_bytes`…): lo arregla `swift_rs_globals()` en `src-tauri/build.rs`. Si una versión nueva de swift-rs lo arregla, esa función deja de hacer nada sola.
- **El script de Xcode** pone `~/.cargo/bin` delante del PATH (si no, gana el Rust de Homebrew, sin `llvm-objcopy`) y va **sin el sandbox de scripts** (`ENABLE_USER_SCRIPT_SANDBOXING: false` en `project.yml` y `NO` en el `.pbxproj`): con él, el script de Tauri no puede leer `.tauri/`. **Si Tauri regenera el proyecto de Xcode, comprueba que sigue así.**
- **En release, las macros no se reducen con `strip`** (`[profile.release.build-override]` en `Cargo.toml`): salían dañadas.

## Trampas conocidas

- **Xcode no hereda tus variables de entorno**: lo que tenga que leer `build.rs` en iOS (la credencial de Google), en archivo.
- **Las capturas del simulador pueden ir un paso por detrás** de los toques: espera un segundo antes de capturar y no repitas un toque porque la captura no lo muestre.
- **Al reinstalar, la app arranca en segundo plano**: ábrela desde su icono.
- **Lo que falta por probar en un iPhone de verdad** está en el «Estado actual» de [features/mobile](../../src/features/mobile/README.md#estado-actual).
