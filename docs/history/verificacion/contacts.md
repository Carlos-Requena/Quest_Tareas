# Historial de verificación · Contactos

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/contacts/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## Registro hasta el 2026-10-07

Hecho el 2026-10-03.

- **Tests:** validación de los cinco tipos (también `javascript:` y `file:`), enlaces que solo son `tel:`, `mailto:` o `https:`, limpieza al leer, proyección (quest con contactos limpios, sin campo si no hay, encargo antiguo con `[]`) y, con el store, un encargo que guarda sus contactos limpios y quitarlos todos emite `contacts: []`.
- **Rust:** `cargo check` con el plugin y la capability (`tauri-build` valida el permiso al compilar).
- **Navegador** (`pnpm dev`, 800 × 600 y 402 × 874): quest «Llamar al dentista» con teléfono y correo (aviso con un correo incompleto), detalle con «Llamar» y «Escribir», icono en la tarjeta, copiar (con el portapapeles de reserva, porque el panel de pruebas no da permiso), dirección en un encargo con «Cómo llegar» sobre el pergamino, formulario y detalle en el teléfono.

**No verificado:** abrir de verdad Teléfono, Mail, WhatsApp o Mapas (en la app nativa de macOS, en Windows y en el iPhone); el portapapeles en el WKWebView; el japonés de esta pantalla (los textos están, sin revisar en pantalla).
