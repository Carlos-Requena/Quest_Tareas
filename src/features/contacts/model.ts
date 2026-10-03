// Modelo puro de los contactos: sin React, sin store, sin Tauri, sin DOM.
// El dominio (src/domain) y features/temporal/model.ts importan SOLO este archivo.
//
// Un contacto es a quién llamar, escribir o dónde ir para una quest o un encargo:
// «Llamar al dentista» con su teléfono, «Entregar el TFG» con el correo del tutor.
// Lo escribe el usuario: no se traduce ni se valida al leerlo (solo se limpia).

export const CONTACT_KINDS = ["phone", "email", "whatsapp", "link", "address"] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number];

/** Un contacto de una quest o un encargo. Va dentro de su definición (QuestDef / TemporalDef). */
export interface ContactRef {
  id: string;
  kind: ContactKind;
  /** A quién (opcional): «Dr. García», «Recepción». */
  name: string;
  /** El dato tal cual se escribió: número, correo, enlace o dirección. */
  value: string;
}

export const CONTACT_LIMITS = { count: 6, name: 60, value: 200 } as const;

/** Solo las cifras (y el + inicial) de un número de teléfono. */
const phoneDigits = (v: string) => (v.trim().startsWith("+") ? "+" : "") + v.replace(/\D/g, "");

/**
 * ¿Sirve el dato para abrirlo? Un teléfono con al menos 3 cifras y sin letras, un
 * correo con @ y dominio, un enlace web (con o sin https://; nada de otros esquemas)
 * y cualquier dirección no vacía.
 */
export function contactValid(kind: ContactKind, value: string): boolean {
  const v = value.trim();
  switch (kind) {
    case "phone":
    case "whatsapp":
      return /^\+?[\d\s().\-/]+$/.test(v) && v.replace(/\D/g, "").length >= 3;
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    case "link":
      return /^(https?:\/\/)?[^\s:/?#]+\.[^\s]+$/i.test(v);
    case "address":
      return v.length > 0;
  }
}

/**
 * Enlace que abre el contacto: llamar (`tel:`), escribir (`mailto:`, WhatsApp con
 * `wa.me`), abrir la web o ver la dirección en Mapas. Sin enlace si el dato no sirve.
 * Solo salen `tel:`, `mailto:` y `https:`: los únicos que permite la app (capabilities).
 */
export function contactHref(c: Pick<ContactRef, "kind" | "value">): string | undefined {
  const v = c.value.trim();
  if (!contactValid(c.kind, v)) return undefined;
  switch (c.kind) {
    case "phone":
      return `tel:${phoneDigits(v)}`;
    case "whatsapp":
      // wa.me pide el número internacional sin «+» ni espacios.
      return `https://wa.me/${v.replace(/\D/g, "")}`;
    case "email":
      return `mailto:${v}`;
    case "link":
      return /^https?:\/\//i.test(v) ? v.replace(/^http:/i, "https:") : `https://${v}`;
    case "address":
      return `https://maps.apple.com/?q=${encodeURIComponent(v)}`;
  }
}

/**
 * Datos tolerantes al leer (proyección): descarta lo mal formado, recorta y limita.
 * Siempre devuelve una lista (vacía si no hay contactos).
 */
export function cleanContacts(list: unknown): ContactRef[] {
  if (!Array.isArray(list)) return [];
  const out: ContactRef[] = [];
  const seen = new Set<string>();
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const { id, kind, name, value } = raw as Partial<ContactRef>;
    if (typeof id !== "string" || !id || seen.has(id)) continue;
    if (!CONTACT_KINDS.includes(kind as ContactKind) || typeof value !== "string") continue;
    const v = value.trim().slice(0, CONTACT_LIMITS.value);
    if (!v) continue;
    seen.add(id);
    out.push({ id, kind: kind as ContactKind, name: typeof name === "string" ? name.trim().slice(0, CONTACT_LIMITS.name) : "", value: v });
    if (out.length >= CONTACT_LIMITS.count) break;
  }
  return out;
}
