// Casos de uso de los contactos: abrirlos (llamar, escribir, ver en Mapas) y copiarlos.
// No generan eventos: los contactos van dentro de la definición de la quest o el encargo.

import { useGame } from "../../store/game";
import { isTauri } from "../../storage/eventStore";
import { sfx } from "../../lib/sfx";
import i18n from "../../i18n";
import { contactHref, type ContactRef } from "./model";

/**
 * Abre el contacto con la app del sistema: Teléfono o FaceTime, Mail, el navegador,
 * WhatsApp o Mapas. En Tauri, con tauri-plugin-opener (solo `tel:`, `mailto:` y
 * `https:`, ver capabilities/default.json); en el navegador de desarrollo, con la web.
 */
export async function openContact(c: ContactRef): Promise<boolean> {
  const href = contactHref(c);
  if (!href) return false;
  try {
    if (isTauri()) {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(href);
    } else if (href.startsWith("https:")) {
      window.open(href, "_blank", "noopener");
    } else {
      window.location.href = href;
    }
    sfx.tick();
    return true;
  } catch (err) {
    console.error(err);
    sfx.cancel();
    useGame.getState().say(() => i18n.t("contacts.toast.openError", { value: c.value }));
    return false;
  }
}

/** Copia el dato (para pegarlo en otra app). */
export async function copyContact(c: ContactRef) {
  const { say } = useGame.getState();
  if (await writeClipboard(c.value)) {
    sfx.tick();
    say(() => i18n.t("contacts.toast.copied", { value: c.value }));
  } else {
    sfx.cancel();
    say(() => i18n.t("contacts.toast.copyError"));
  }
}

/** El portapapeles moderno y, si no deja (permisos del WebView), el de toda la vida. */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    try {
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      area.remove();
    }
  }
}
