# Notificaciones del sistema

Avisos fuera de la app: cuando termina una ronda o un descanso de un pomodoro, antes de un encargo o de un bloque de la agenda, el día de una fecha límite (y por la tarde, si sigue pendiente: se fracturará o se quemará a medianoche) y cuando una racha está a punto de romperse. Se activan con la campana de la cabecera (en el teléfono, «Avisos» en el menú «Más»).

Sigue la convención del proyecto: **una carpeta por implementación** (`src/features/<nombre>/`).

---

## Requisitos

| # | Requisito | Cómo se cumple |
|---|---|---|
| R1 | Que la app avise aunque no esté delante | `tauri-plugin-notification`: programadas en iOS, temporizador en el escritorio |
| R2 | Avisos útiles, no ruido | Siete tipos, pensados para no perderse nada (tabla de abajo) |
| R3 | Que cada equipo decida | Preferencia de cada equipo (`quests.notify`), como el sonido; sin eventos |

---

## Decisiones de diseño

### Qué avisa y cuándo (`planReminders`)

| Tipo | Cuándo | Texto |
|---|---|---|
| `pomodoro` | Al acabar cada concentración y cada descanso de un pomodoro **en marcha** | «Ronda 1 de 4 terminada: toca descansar», «Pomodoro terminado» |
| `temporal` | 15 min antes de un encargo con hora; a las 9:00 si es de todo el día | «Encargo a las 17:30» |
| `temporalBurn` | A las 20:00 del día (o una hora después de su hora, si es más tarde) | «Sigue sin cumplir: el cartel se quemará a medianoche» |
| `questDue` | A las 9:00 del día de la fecha límite | «Vence hoy» |
| `questFracture` | A las 20:00 de ese día | «Sigue sin completar: se fracturará a medianoche» |
| `agenda` | 5 min antes de cada bloque | «Empieza a las 19:00» |
| `streak` | 3 h antes de que se rompa una racha de 2 o más | «Tu racha de 5 se rompe en 3 horas» |

Los avisos de «se fracturará» y «se quemará» solo salen para lo que de verdad falla (no lo perdonado, features/failure). Se calculan los de los **próximos dos días**; el plan se recalcula al cambiar cualquier cosa y cada 5 minutos.

### Cómo llegan

| Dónde | Cómo |
|---|---|
| **iPhone** | El sistema avisa con la app cerrada: se **programan** (`Schedule.at`) hasta 60 (iOS admite 64 pendientes). Si el plan cambia, se cancelan los anteriores (sus ids, en `quests.notifyIds`) y se programan otra vez. Al cambiar de idioma también |
| **Escritorio** | `tauri-plugin-notification` solo enseña avisos al momento (no programa ni cancela), así que un temporizador espera al siguiente. Con la ventana detrás o minimizada, aviso del sistema; delante, el aviso de la app con su campana (los de pomodoro y encargos ya salían dentro de la app y no se repiten). Con la app cerrada no avisa |
| **Navegador** (`pnpm dev`) | La API `Notification` del navegador |

Cada aviso tiene una clave estable (`pomo:quest:condición:fase:ronda:…`) y su id numérico de 32 bits sale de ella (`notificationId`).

### Permisos (CSP y capacidades)

En `capabilities/default.json`, solo lo que se usa: `notification:allow-is-permission-granted`, `allow-request-permission`, `allow-notify`, `allow-cancel` y `allow-get-pending`. No hace falta tocar la CSP: el plugin habla por IPC.

---

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | `planReminders`, `pomodoroBoundaries`, `notificationId`, `planFingerprint` y las horas fijas. Puro |
| `service.ts` | Permiso y preferencia, textos, enseñar ya (escritorio) y programar / cancelar (iOS) |
| `i18n.ts` | Textos es + ja |
| `components/NotificationScheduler.tsx` | Calcula el plan y lo entrega (no pinta nada) |
| `components/NotifyToggle.tsx` | Campana de la cabecera e interruptor del menú «Más» |
| `model.test.ts` | Fases del pomodoro, fechas límite, encargos, agenda, lo terminado y los ids |

## Puntos de integración

| Fuera de la carpeta | Cambio |
|---|---|
| `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs` | `tauri-plugin-notification` |
| `src-tauri/capabilities/default.json` | Los cinco permisos |
| `package.json` | `@tauri-apps/plugin-notification` |
| `App.tsx` | `NotificationScheduler` |
| `components/Header.tsx` | Campana |
| `features/mobile/components/MobileMenu.tsx` | «Avisos» |
| `i18n/locales/{es,ja}.ts` | Montan `notifications` |

---

## Verificación

Hecho el 2026-10-06.

- **Tests:** `model.test.ts`.
- **`cargo check`** con el plugin y los permisos.
- **Navegador:** con los avisos activados, un bloque de la agenda a 6 minutos: el temporizador lanza a su hora «Llamada con el gestor · Empieza a las 17:19» (la API del navegador sustituida para no pedir permiso).

**No verificado:** los avisos del sistema de verdad en macOS, Windows y, sobre todo, **programados en el iPhone** (el plugin y su parte de iOS no se han compilado para iOS ni probado en el simulador); el permiso de iOS la primera vez; el sonido de los avisos.
