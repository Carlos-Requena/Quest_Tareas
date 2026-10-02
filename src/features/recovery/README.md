# Recuperación ante fallos de la interfaz

Un *error boundary* de React con una pantalla de recuperación. Sin él, un fallo al dibujar cualquier componente dejaba la ventana en negro (pasó durante las pruebas de la fase 1). Forma parte de la fase 1.5 de la hoja de ruta (endurecimiento).

## Requisitos

- Un fallo de React al dibujar no deja la ventana en negro: sale una pantalla que explica qué ha pasado.
- Deja claro que el progreso **no se ha perdido**: cada acción ya está guardada como evento antes de dibujarse.
- Ofrece **volver a intentarlo** (montar la app otra vez, sin recargar) y **reiniciar** (recargar la ventana).
- Muestra los detalles del fallo plegados, con un botón para copiarlos y poder informar de él.
- Traducida al español y al japonés.

## Decisiones

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Un solo boundary en la raíz (`main.tsx`) | Uno por sección o por ventana modal | Es lo que pedía la deuda («sin error boundary»). La app es una sola pantalla con capas; un fallo a medias deja estados raros (una ventana modal sin su tablón). Se pueden añadir más adelante |
| «Volver a intentarlo» vuelve a montar la app con una `key` nueva | Solo borrar el error | Los componentes que fallaron se crean desde cero, sin el estado local roto. El store de Zustand se conserva: `init()` solo se ejecuta una vez |
| La pantalla no usa el store ni nada del juego | Mostrar el nivel o el oro para tranquilizar | El fallo puede venir del store o de la proyección |
| Es una `class` | Una función | React solo atrapa los fallos con `getDerivedStateFromError` / `componentDidCatch`, que son de clase. Es la excepción de la interfaz, como `MusicPlayer` en los recursos |
| Etiqueta «CONTINUE?» en inglés | Traducirla | Es decorativa, como «QUEST CLEAR» o «LEVEL UP!» |

## Qué atrapa y qué no

Atrapa los fallos al **dibujar** (render, efectos de montaje, constructores). No atrapa los de los manejadores de eventos (un clic), los de código asíncrono (`dispatch`, `init`) ni los de GSAP: esos no tumban la ventana. El fallo de `init()` (no se puede abrir la base de datos) ya se muestra en el tablón con `app.dbError`.

## Archivos

| Archivo | Qué hace |
|---|---|
| `model.ts` | `describeFailure` (cualquier cosa lanzada → mensaje y pilas) y `failureReport` (texto para copiar) |
| `components/ErrorBoundary.tsx` | El boundary: atrapa, registra en la consola y monta de nuevo al reintentar |
| `components/RecoveryScreen.tsx` | La pantalla, con los dos botones y los detalles plegados |
| `i18n.ts` | Textos `recovery.*` en español y japonés |
| `recovery.css` | Estilos, con los tokens de `theme.css` |

## Puntos de integración

| Fuera de la carpeta | Cambio |
|---|---|
| `src/main.tsx` | `<ErrorBoundary>` envuelve a `<App />` |
| `src/i18n/locales/{es,ja}.ts` | Montan `recoveryEs` / `recoveryJa` bajo `recovery` |
| `vite.config.ts` y `src/vite-env.d.ts` | `__APP_VERSION__` (la versión de `package.json`) para el informe del fallo |

## Verificación

- Tests de `model.ts` (`model.test.ts`): errores, cosas lanzadas que no son errores y el formato del informe.
- En el navegador (`pnpm dev`): se forzó un fallo real poniendo `state.quests = null` en el store → sale la pantalla (en japonés, el idioma del navegador). Al devolver el estado y pulsar «Volver a intentarlo», vuelve el tablón con sus 5 tarjetas.
- **Sin probar:** el botón de copiar (el portapapeles pide permiso en el navegador de pruebas), la pantalla en español a simple vista (solo se comprobaron los tipos de los textos) y la app nativa.
