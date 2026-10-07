---
funcionalidad: contacts
titulo: Contactos
resumen: Teléfono, correo, WhatsApp, enlace o dirección en quests y encargos, con su botón para llamar, escribir, abrir o ver cómo llegar.
tipo: dominio
eventos: []
preferencias: []
adr: [ADR-39]
---

# Contactos

Una quest o un encargo puede llevar **a quién llamar o escribir, o dónde ir**: «Llamar al dentista» con su teléfono, «Entregar el TFG» con el correo del tutor, «Examen» con la dirección del aula. En el formulario, un **desplegable** elige qué se añade; en el detalle, cada contacto lleva un botón para **llamar, escribir, abrir o ver cómo llegar**, y otro para copiarlo.

## Qué hace

| # | Requisito del propietario | Cómo se cumple |
|---|---|---|
| R1 | Un desplegable para añadir un contacto, un correo, etc. | `ContactsField`: un `<select>` «+ Añadir contacto…» con los cinco tipos y una fila por contacto (a quién y el dato) |
| R2 | Poder agendar una llamada | La quest (con su fecha límite) lleva el teléfono; en el detalle, «Llamar» abre Teléfono (o FaceTime en el Mac) |
| R3 | Igual en el Mac, Windows y el iPhone | `tauri-plugin-opener` (también en iOS) con permiso solo para `tel:`, `mailto:` y `https:` |

| Tipo | Dato | Botón | Abre |
|---|---|---|---|
| `phone` | Teléfono, con o sin prefijo | Llamar | `tel:+34600123456` (solo cifras y el `+`) |
| `email` | Correo | Escribir | `mailto:` |
| `whatsapp` | Teléfono **con prefijo del país** | WhatsApp | `https://wa.me/34600123456` |
| `link` | Web, con o sin `https://` | Abrir | `https://…` (un `http://` se abre como `https://`) |
| `address` | Dirección libre | Cómo llegar | `https://maps.apple.com/?q=…` (Mapas en el Mac y el iPhone, la web en Windows) |

## Reglas y decisiones

- **Escritos a mano**, por decisión del propietario: no se eligen de la agenda del sistema. Funciona igual en todos los equipos, no pide permisos de Contactos y no necesita código nativo ([ADR-39](../../../docs/decisions/ADR-39-contactos.md)).
- **Validación suave:** el formulario avisa si el dato no parece lo que es («No parece un teléfono: no se podrá llamar»), pero deja guardar (puede ser una nota). Un dato que no sirve **no lleva botón**, solo el de copiar.
- **Nada de otros esquemas:** un enlace solo puede ser web (`javascript:`, `file:`… no pasan `contactValid`) y `contactHref` solo produce `tel:`, `mailto:` y `https:`, lo mismo que permite la capability. Un test lo comprueba para los cinco tipos.
- **Copiar:** `navigator.clipboard` y, si el WebView no da permiso, `execCommand("copy")`. Aviso «copiado» o «No se pudo copiar».
- **Abrirlos con `tauri-plugin-opener`**: el crate `open` no sirve dentro de una app de iOS (lanza `uiopen`, que no existe). Se concede **solo** `opener:allow-open-url` con tres esquemas (`tel:*`, `mailto:*`, `https://*`), no `opener:default` (que además deja revelar archivos). En `pnpm dev`, `https:` se abre en otra pestaña y `tel:` / `mailto:` con `location.href`. La CSP no cambia: abrir una URL va por IPC.

## Modelo

`ContactRef { id, kind: ContactKind, name, value }`. Van **dentro de la definición**: `QuestDef.contacts?` y `TemporalDef.contacts` (hasta 6 en cada una), y viajan y se sincronizan con ella.

- **Quests:** se editan con el resto de la quest (`quest_updated`, [editing](../editing/README.md)).
- **Encargos:** `temporal_updated` lleva la lista entera en el parche cuando cambia (quitarlos todos es `contacts: []`, porque un campo ausente se perdería en el JSON).
- **Al leer** (`cleanContacts`, en la proyección y en `normalize()` de los encargos): sin ids repetidos ni tipos desconocidos, sin datos vacíos, recortados (60 caracteres el nombre, 200 el dato) y como mucho 6. Una quest sin contactos no tiene el campo; un encargo tiene `[]`.

## Eventos

No tiene eventos propios: los contactos viajan en `quest_created`, `quest_updated`, `temporal_created` y `temporal_updated`. Los datos antiguos no traen `contacts` y se leen como «sin contactos», sin *upcaster*.

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | Tipos, `contactValid`, `contactHref` y `cleanContacts`. Puro: lo importan el dominio y `features/temporal/model.ts` |
| `actions.ts` | `openContact` (plugin opener o la web) y `copyContact` |
| `components/ContactsField.tsx` | El desplegable y las filas del formulario |
| `components/ContactList.tsx` | Los contactos con sus botones (detalle de la quest y cartel abierto) |
| `components/ContactIcon.tsx` | Icono de cada tipo |
| `contacts.css`, `i18n.ts` | Estilos (también sobre el pergamino de los encargos y en el teléfono) y textos es + ja |
| `model.test.ts` | Validación, enlaces, limpieza y proyección |

## Integración

| Fuera de la carpeta | Cambio |
|---|---|
| `src/domain/types.ts` | `QuestDef.contacts?` |
| `src/domain/projection.ts` | `quest_created` limpia los contactos (`cleanContacts`) |
| `src/features/temporal/model.ts` | `TemporalDef.contacts` y `normalize()` |
| `src/features/temporal/actions.ts` | `TemporalDraft.contacts`; se guardan limpios y entran en el parche al editar |
| `src/components/CreateQuestModal.tsx` | `<ContactsField>` tras la fecha límite |
| `src/components/QuestDetail.tsx` | Sección «Contact · Contactos» con `<ContactList>` |
| `src/components/QuestCard.tsx` | Icono del primer contacto junto al plazo |
| `src/features/temporal/components/TemporalForm.tsx`, `src/features/temporal/components/PosterView.tsx` | El campo en el formulario del encargo y la lista en el cartel abierto |
| `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json` | `tauri-plugin-opener`, su registro y el permiso acotado |
| `package.json` | `@tauri-apps/plugin-opener` |
| `src/i18n/locales/{es,ja}.ts` | Montan `contacts` |
| `src/test/streams.ts` | Quests con contactos (también repetidos, vacíos y de un tipo desconocido) |

## Dependencias

- No importa otras funcionalidades.
- **La usan:** `temporal` (contactos de los encargos) y `editing` (limpia los contactos del parche).

## Estado actual

- **Última verificación:** 2026-10-03, tests, `cargo check` con el plugin y la capability, y navegador a 800 × 600 y 402 × 874.
- **Tests:** `model.test.ts` y, con el store, `src/store/game.test.ts`.
- **Sin verificar:** abrir de verdad Teléfono, Mail, WhatsApp o Mapas (app nativa de macOS, Windows e iPhone); el portapapeles en el WKWebView; el japonés de esta pantalla a simple vista.
- **Historial:** [docs/history/verificacion/contacts.md](../../../docs/history/verificacion/contacts.md).

## Pendiente

- Elegir de la agenda del iPhone (`CNContactPickerViewController`, que no pide permiso).
