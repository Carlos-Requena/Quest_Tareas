---
funcionalidad: recovery
titulo: Recuperación ante fallos
resumen: Error boundary en la raíz con una pantalla de recuperación, en vez de la ventana en negro, que deja reintentar sin perder nada.
tipo: infraestructura
eventos: []
preferencias: []
adr: [ADR-27]
---

# Recuperación ante fallos

Un *error boundary* de React con una pantalla de recuperación: un fallo al dibujar cualquier componente no deja la ventana en negro.

## Qué hace

- Ante un fallo de React al dibujar, sale una pantalla que explica qué ha pasado.
- Deja claro que el progreso **no se ha perdido**: cada acción ya está guardada como evento antes de dibujarse.
- Ofrece **volver a intentarlo** (montar la app otra vez, sin recargar) y **reiniciar** (recargar la ventana).
- Muestra los detalles del fallo plegados, con un botón para copiarlos.
- En español y japonés.

**Qué atrapa:** los fallos al **dibujar** (render, efectos de montaje, constructores). **Qué no:** los de los manejadores de eventos, el código asíncrono (`dispatch`, `init`) y GSAP; esos no tumban la ventana. El fallo de `init()` (no se puede abrir la base de datos) ya se muestra en el tablón con `app.dbError`.

## Reglas y decisiones

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Un solo boundary en la raíz (`main.tsx`) | Uno por sección o por ventana | La app es una pantalla con capas; un fallo a medias deja estados raros (una ventana sin su tablón) |
| «Volver a intentarlo» monta la app con una `key` nueva | Solo borrar el error | Los componentes que fallaron se crean de cero, sin el estado local roto; el store de Zustand se conserva (`init()` solo corre una vez) |
| La pantalla no usa el store ni nada del juego | Mostrar el nivel o el oro | El fallo puede venir del store o de la proyección |
| Es una `class` | Una función | React solo atrapa fallos con `getDerivedStateFromError` / `componentDidCatch`, que son de clase |
| «CONTINUE?» en inglés | Traducirlo | Es decorativo, como «QUEST CLEAR» |

Ver [ADR-27](../../../docs/decisions/ADR-27-error-boundary.md).

## Eventos

No tiene eventos.

## Archivos

| Archivo | Qué hace |
|---|---|
| `model.ts` | `describeFailure` (cualquier cosa lanzada → mensaje y pilas) y `failureReport` (texto para copiar). Puro |
| `components/ErrorBoundary.tsx` | El boundary: atrapa, registra en la consola y monta de nuevo al reintentar |
| `components/RecoveryScreen.tsx` | La pantalla, con los dos botones y los detalles plegados |
| `recovery.css`, `i18n.ts` | Estilos (con los tokens de `theme.css`) y textos `recovery.*` |
| `model.test.ts` | Errores, cosas lanzadas que no son errores y el formato del informe |

## Integración

| Fuera de la carpeta | Cambio |
|---|---|
| `src/main.tsx` | `<ErrorBoundary>` envuelve a `<App />` |
| `vite.config.ts`, `src/vite-env.d.ts` | `__APP_VERSION__` (la versión de `package.json`) para el informe del fallo |
| `src/i18n/locales/{es,ja}.ts` | Montan `recoveryEs` / `recoveryJa` bajo `recovery` |

## Dependencias

- No importa otras funcionalidades (a propósito: tiene que funcionar aunque falle cualquiera).
- **La usan:** ninguna; la monta `src/main.tsx`.

## Estado actual

- **Última verificación:** 2026-10-02, tests y un fallo forzado en el navegador (`state.quests = null`): sale la pantalla y «Volver a intentarlo» devuelve el tablón.
- **Tests:** `model.test.ts`.
- **Sin verificar:** el botón de copiar (el portapapeles pide permiso en el navegador de pruebas), la pantalla en español a simple vista y la app nativa.
- **Historial:** [docs/history/verificacion/recovery.md](../../../docs/history/verificacion/recovery.md).
