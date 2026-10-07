# Configurar y verificar la sincronización

Cómo funciona por dentro: [features/sync](../../src/features/sync/README.md). Aquí, lo operativo.

## Credenciales (fuera del repositorio)

| Dónde | Archivo o secreto | Qué es |
|---|---|---|
| Escritorio | `src-tauri/google-client.json` | El JSON del cliente OAuth «App de escritorio» de Google Cloud |
| iPhone | `src-tauri/google-client-ios.plist` (o `google-client-ios.json` con `{"client_id": "…"}`) | El cliente «iOS», en el **mismo proyecto** de Google Cloud |
| CI | `QUESTS_GOOGLE_CLIENT_ID`, `QUESTS_GOOGLE_CLIENT_SECRET` | Secretos del repositorio |

- Los tres archivos están en `src-tauri/.gitignore` y `build.rs` los incrusta al compilar. Sin credencial, la app compila igual y la sincronización sale «sin configurar».
- El cliente iOS usa el *bundle ID* de la app en iOS (el de `src-tauri/tauri.ios.conf.json`; por qué no es `com.quests.app`, en [compilar-ios.md](compilar-ios.md#firmar-con-un-apple-id-gratuito)). Si no está en el mismo proyecto que el de escritorio, cada uno verá sus propios archivos de Drive (`drive.file`).
- La variable `QUESTS_GOOGLE_IOS_CLIENT_ID` no llega cuando compila Xcode: en local, usa el archivo.
- Con la app de Google Cloud en modo «Testing», la sesión caduca cada 7 días (`signed_out`): hay que volver a conectar.

## Probar dos equipos en un mismo Mac

```bash
pnpm tauri build --debug --no-bundle --config '{"identifier":"com.quests.app.equipob"}'
```

Es otra base de datos y otro `deviceId`, pero **la misma sesión de Google** (el llavero es del usuario): **lo que hagas en esa copia llega al Drive del propietario**. Avísale antes y no dejes datos de prueba en su tablero.

Qué comprobar:

1. Iniciar sesión en una copia; la otra ve la sesión.
2. Acciones distintas en las dos, sincronizar en las dos (al volver a la ventana, o desde el panel de la nube) y comprobar que tienen **los mismos eventos** (por ejemplo, contándolos con `sqlite3` en cada base, como en [verificar-tauri.md](verificar-tauri.md)).
3. Los datos de ejemplo de dos equipos que empiezan vacíos se juntan en uno; una quest retirada no vuelve.
4. Un adjunto de un encargo llega al otro equipo (aún sin probar con Drive de verdad).

## Si falla

- **Logs:** los errores de Rust van a la salida de error con `[sync] …`; el panel de la nube enseña el motivo (los `code` están en el README de la funcionalidad).
- **Primer intento tras activar la API de Drive:** puede fallar unos minutos; vuelve a probar.
- **Los tests** (`src/features/sync/engine.test.ts`) prueban el motor con dos y tres equipos en memoria y un Drive falso (`src/test/memory.ts`): si cambias el motor, que sigan llegando al mismo estado en cualquier orden.
