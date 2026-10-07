---
funcionalidad: notifications
titulo: Avisos del sistema
resumen: Avisos fuera de la app para pomodoros, encargos, agenda, fechas límite y rachas; programados en iOS y con un temporizador en el escritorio.
tipo: servicio
eventos: []
preferencias: [quests.notify, quests.notifyIds]
adr: [ADR-47]
---

# Avisos del sistema

Avisos fuera de la app: al terminar una ronda o un descanso de un pomodoro, antes de un encargo o de un bloque de la agenda, el día de una fecha límite (y por la tarde, si sigue pendiente: se fracturará o se quemará a medianoche) y cuando una racha está a punto de romperse. Se activan con la campana de los ajustes del [menú](../menu/README.md) (en el teléfono, la fila «Avisos»).

## Qué hace

| # | Requisito | Cómo se cumple |
|---|---|---|
| R1 | Que la app avise aunque no esté delante | `tauri-plugin-notification`: programados en iOS, temporizador en el escritorio |
| R2 | Avisos útiles, no ruido | Siete tipos (tabla de abajo) |
| R3 | Que cada equipo decida | Preferencia de cada equipo (`quests.notify`), como el sonido; sin eventos |

| Tipo | Cuándo | Texto |
|---|---|---|
| `pomodoro` | Al acabar cada concentración y cada descanso de un pomodoro **en marcha** | «Ronda 1 de 4 terminada: toca descansar», «Pomodoro terminado» |
| `temporal` | 15 min antes de un encargo con hora; a las 9:00 si es de todo el día | «Encargo a las 17:30» |
| `temporalBurn` | A las 20:00 del día (o una hora después de su hora, si es más tarde) | «Sigue sin cumplir: el cartel se quemará a medianoche» |
| `questDue` | A las 9:00 del día de la fecha límite | «Vence hoy» |
| `questFracture` | A las 20:00 de ese día | «Sigue sin completar: se fracturará a medianoche» |
| `agenda` | 5 min antes de cada bloque | «Empieza a las 19:00» |
| `streak` | 3 h antes de que se rompa una racha de 2 o más | «Tu racha de 5 se rompe en 3 horas» |

## Reglas y decisiones

- **Plan calculado** (`planReminders`): los avisos de los **próximos dos días**, recalculados al cambiar cualquier cosa y cada 5 minutos. Los de «se fracturará» y «se quemará» solo salen para lo que de verdad falla (no lo perdonado, [failure](../failure/README.md)).
- **Cómo llegan** ([ADR-47](../../../docs/decisions/ADR-47-avisos-del-sistema.md)):

  | Dónde | Cómo |
  |---|---|
  | **iPhone** | El sistema avisa con la app cerrada: se **programan** (`Schedule.at`) hasta 60 (iOS admite 64 pendientes). Si el plan cambia, se cancelan los anteriores (sus ids, en `quests.notifyIds`) y se programan otra vez; al cambiar de idioma, también |
  | **Escritorio** | El plugin solo enseña avisos al momento (no programa ni cancela), así que un temporizador espera al siguiente. Con la ventana detrás o minimizada, aviso del sistema; delante, el aviso de la app con su campana (los de pomodoro y encargos ya salían dentro de la app y no se repiten). **Con la app cerrada no avisa** |
  | **Navegador** (`pnpm dev`) | La API `Notification` del navegador |

- Cada aviso tiene una clave estable (`pomo:quest:condición:fase:ronda:…`) y su id numérico de 32 bits sale de ella (`notificationId`).
- **Permisos**: en `src-tauri/capabilities/default.json`, solo lo que se usa (`notification:allow-is-permission-granted`, `allow-request-permission`, `allow-notify`, `allow-cancel` y `allow-get-pending`). La CSP no cambia: el plugin habla por IPC.

## Eventos

No tiene eventos: el plan se calcula del estado y la preferencia es de cada equipo.

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | `planReminders`, `pomodoroBoundaries`, `notificationId`, `planFingerprint` y las horas fijas. Puro |
| `service.ts` | Permiso y preferencia, textos, enseñar ya (escritorio) y programar / cancelar (iOS) |
| `components/NotificationScheduler.tsx` | Calcula el plan y lo entrega (no pinta nada) |
| `components/NotifyToggle.tsx` | `NotifyButton` (campana de los ajustes, escritorio) y `NotifyMenuToggle` (fila «Avisos», teléfono) |
| `i18n.ts` | Textos es + ja |
| `model.test.ts` | Fases del pomodoro, fechas límite, encargos, agenda, lo terminado y los ids |

## Integración

| Fuera de la carpeta | Cambio |
|---|---|
| `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs` | `tauri-plugin-notification` |
| `src-tauri/capabilities/default.json` | Los cinco permisos |
| `package.json` | `@tauri-apps/plugin-notification` |
| `src/App.tsx` | `NotificationScheduler` |
| `src/features/menu/components/MenuSettings.tsx` | La campana y el interruptor |
| `src/i18n/locales/{es,ja}.ts` | Montan `notifications` |

## Dependencias

- **features/pomodoro**, **features/temporal**, **features/agenda**, **features/streaks**, **features/complex**, **features/failure** (sus `model.ts`): de ahí sale cuándo avisar. Para cambiar un aviso no hace falta leer sus README, salvo que cambie la regla que lo origina.
- **La usan:** `menu` (los controles en los ajustes).

## Estado actual

- **Última verificación:** 2026-10-06, tests, `cargo check` con el plugin y navegador (el temporizador lanza a su hora el aviso de un bloque de la agenda). La app compila con el plugin para el simulador de iOS y para el iPhone (release).
- **Tests:** `model.test.ts`.
- **Sin verificar:** nadie ha visto aún un aviso del sistema de verdad: ni programado en el iPhone con la app cerrada, ni en macOS o Windows; el permiso de iOS la primera vez; el sonido de los avisos.
- **Historial:** [docs/history/verificacion/notifications.md](../../../docs/history/verificacion/notifications.md).

## Pendiente

- En el escritorio, avisos programados desde Rust para que salgan con la app cerrada.
