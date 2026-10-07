# Historial de verificación · Sincronización con Google Drive (fase 2)

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/sync/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## Registro hasta el 2026-10-07

- **Tests** (`engine.test.ts`, 18, con dos o tres «equipos» en memoria y un Drive falso, `src/test/memory.ts`):
  - 6 historiales aleatorios de 300 eventos por equipo que tocan las mismas quests: los dos llegan a los mismos 600 eventos y al mismo estado.
  - Con tres equipos, el orden de las sincronizaciones no cambia el resultado.
  - Una sincronización sin novedades no sube ni baja nada.
  - Cada equipo escribe solo su archivo.
  - Un evento hecho durante la subida va en la siguiente.
  - Un fallo a medias no pierde lo ya fusionado.
  - Las líneas rotas y las de otro equipo se saltan.
  - Los eventos de una versión futura viajan sin cambiar el estado.
  - Los adjuntos viajan una sola vez, los huérfanos no suben y uno dañado no se guarda.
  - Los ejemplos de dos equipos se juntan, y uno retirado no vuelve.
- **Prueba de mutación:** de 4 errores introducidos, los tests detectan 3. El cuarto (marcar como subido todo lo leído para subir) es equivalente: incluye siempre lo que no estaba subido.
- **En la app nativa de macOS, con Google Drive de verdad**, se usaron dos copias de la app con identificadores distintos (dos bases y dos `deviceId`):
  - Inicio de sesión con PKCE y token en el llavero.
  - A subió sus 15 eventos y B bajó esos 15 y subió los suyos. Los ejemplos se juntaron: 5 quests y 10 objetos.
  - El propietario aceptó, avanzó y completó quests en las dos copias. Tras sincronizar, las dos tenían los mismos 37 eventos, todos subidos y sin errores.
  - El primer intento tras conectar falló sin dejar rastro. Al volver a abrir funcionó; lo más probable es que la API de Drive aún no estuviera activa (se había activado minutos antes). Desde entonces, los fallos se registran (`[sync] …`).
- **iPhone (simulador de iOS 27)**, con un id de cliente falso (`google-client-ios.json` temporal):
  - El llavero de iOS responde (sale «Conectar», no un error).
  - «Conectar» abre el aviso del sistema y la hoja de Safari con la página de Google, que contesta `invalid_client` (lo esperado con un id falso): la URL, el esquema y el plugin funcionan.
  - Cerrar la hoja vuelve a «Conectar» sin aviso.
- **iPhone (simulador), con el cliente iOS de verdad** (proyecto 1002522575092, el mismo que el de escritorio; *bundle ID* creado como `com.quests.app`; hay que cambiarlo a `com.requenadonacarlos.quests`): Google acepta el cliente y enseña su página de inicio de sesión («continuar a "Quests"»). No se llegó a iniciar sesión.
- **Sin probar:**
  - Iniciar sesión en iOS de principio a fin, el canje del código sin secreto y la sincronización entre el iPhone y el Mac (falta crear el cliente iOS en Google Cloud).
  - Sincronizar al salir de la app en iOS (cuánto deja iOS terminar antes de suspenderla).
  - Windows.
  - Los adjuntos con Drive de verdad (solo en los tests).
  - La sincronización al cerrar la ventana.
  - La caducidad a los 7 días.
  - Dos equipos físicos distintos.
