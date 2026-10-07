---
funcionalidad: music
titulo: Música de fondo
resumen: Música en bucle con fundidos y volumen, en los ajustes del menú y con la tecla M; preferencia de cada equipo, sin eventos.
tipo: servicio
eventos: []
preferencias: [quests.music]
adr: []
---

# Música de fondo

Música en bucle con fundidos. El control (ecualizador animado y volumen en un desplegable flotante) está en los ajustes del [menú](../menu/README.md) y la tecla `M` la enciende y apaga. El botón ♪ de esos ajustes es el **silencio general**: calla efectos y música. La preferencia (activada o no, volumen y pista) se guarda **en cada equipo**.

## Qué hace

- Suena en bucle la pista elegida, con fundido de entrada (1,5 s) y de salida.
- Arranca con el primer clic o tecla si la preferencia es «con música» (los WebView no dejan sonar audio antes).
- Volumen por equipo; el silencio general no borra la preferencia de música.

## Reglas y decisiones

- **Fuera del dominio y de los eventos.** No da XP ni cambia quests, y cada equipo puede querer algo distinto: no es un evento, no está en `GameState` y no se sincroniza.
- **Aquí sí, una clase.** `MusicPlayer` envuelve un recurso imperativo (`<audio>`) con su ciclo de vida. Es una instancia única (`music`) guardada en `globalThis` y la interfaz se suscribe con `useSyncExternalStore` (`useMusic()`) ([AGENTES.md](../../../docs/AGENTES.md#54-clases-o-funciones)).
- **Autoplay.** Con la preferencia «con música», `armAutoplay()` espera al primer clic o tecla. Si ese gesto es el propio botón de música o la tecla `M`, decide el botón, para no encender y apagar a la vez. Como el control solo se monta con el menú abierto, `MenuScreen` (siempre montado) llama a `music.armAutoplay()` al arrancar.
- **Dos botones, dos significados:**

  | Botón | Qué hace | Qué guarda |
  |---|---|---|
  | Música (ecualizador) o `M` | Enciende y apaga **solo la música** | `quests.music` (activada, volumen y pista) |
  | ♪ (silencio general) | Efectos y música | `quests.muted` (de `src/lib/sfx.ts`) |

  Al quitar el silencio, la música vuelve si estaba encendida; pulsar música con todo silenciado quita el silencio. `src/lib/sfx.ts` avisa de los cambios (`onMutedChange`) y el reproductor reacciona.
- **Volumen por Web Audio**: `<audio>` → `MediaElementSource` → `GainNode`. Volumen y fundidos van en la **ganancia** (rampas exactas con `linearRampToValueAtTime`), porque algunos WebView ignoran `audio.volume`.
- **Cargar en memoria**: la pista se descarga entera con `fetch` y se reproduce desde un `Blob`, para no depender de las peticiones por rangos (`Range`) contra el protocolo de Tauri en la app empaquetada.
- **Robustez**: dos `play()` seguidos comparten la misma carga (nunca dos `<audio>`); la instancia en `globalThis` sobrevive a una recarga en caliente a medias; `import.meta.hot.dispose` libera el reproductor antiguo. El volumen es un desplegable flotante (no mueve nada al abrirse).

### Dónde van los archivos

Las pistas van en `public/music/`; Vite las copia tal cual a `dist/music/` y la app las sirve en `/music/…`. **Nunca en `dist/`**, que se borra en cada build.

### Añadir una pista

1. Copia el archivo a `public/music/`.
2. Añádela a `TRACKS` en `tracks.ts`: `{ id: "forest", file: "bosque.mp3" }`.
3. Su nombre en `i18n.ts` (`tracks.forest`), en español y japonés.

## Modelo

`MusicPlayer` (`play`, `pause`, `toggle`, `setVolume`, `armAutoplay`, `subscribe`, `getSnapshot`, `dispose`) con su `MusicState` (`enabled`, `playing`, `volume`, `trackId`, `loading`, `error?`). `Track { id, file }`.

## Eventos

No tiene eventos: es una preferencia local.

## Archivos

| Archivo | Contenido |
|---|---|
| `player.ts` | Clase `MusicPlayer` + instancia única `music` |
| `tracks.ts` | Lista de pistas y su URL |
| `useMusic.ts` | Hook de React (`useSyncExternalStore`) |
| `components/MusicControl.tsx` | Botón con ecualizador y volumen |
| `music.css`, `i18n.ts` | Estilos del control y textos es + ja |

## Integración

| Fuera de la carpeta | Cambio |
|---|---|
| `public/music/` | Los archivos de música |
| `src/features/menu/components/MenuSettings.tsx` | `<MusicControl />` en los ajustes |
| `src/features/menu/components/MenuScreen.tsx` | `music.armAutoplay()` al arrancar |
| `src/App.tsx` | Tecla `M` |
| `src/i18n/locales/{es,ja}.ts` | Montan `music` |

## Dependencias

- No importa otras funcionalidades (escucha el silencio de `src/lib/sfx.ts`).
- **La usan:** `menu` (el control en los ajustes).

## Estado actual

- **Última verificación:** 2026-10-07, el control dentro de los ajustes del menú en el navegador. El reproductor (una sola descarga, `M`, volumen en la ganancia, silencio general) se comprobó en el navegador al hacerlo.
- **Tests:** ninguno (recurso imperativo, sin lógica pura).
- **Sin verificar:** que suene de verdad (sin salida de audio en las pruebas: se comprobó el estado del reproductor); la app empaquetada en macOS y Windows; la música con el interruptor de silencio del iPhone.
- **Historial:** [docs/history/verificacion/music.md](../../../docs/history/verificacion/music.md).

## Pendiente

- Selector de pista cuando haya varias, o lista con orden aleatorio.
- Bajar el volumen durante la concentración del pomodoro y subirlo en el descanso.
- Música distinta por categoría de quest, o una sintonía en «Quest Clear».
