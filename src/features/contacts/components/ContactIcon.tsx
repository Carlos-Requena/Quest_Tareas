import type { ContactKind } from "../model";

/** Icono de cada tipo de contacto, con el color del texto. */
export function ContactIcon({ kind }: { kind: ContactKind }) {
  return (
    <svg viewBox="0 0 16 16" className="ct-ico" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {kind === "phone" && <path d="M4.2 1.8h2l1 3-1.5 1a8 8 0 0 0 4.3 4.3l1-1.5 3 1v2a1.6 1.6 0 0 1-1.7 1.6A11.8 11.8 0 0 1 2.6 3.5 1.6 1.6 0 0 1 4.2 1.8Z" />}
      {kind === "email" && (
        <>
          <rect x="1.8" y="3.2" width="12.4" height="9.6" rx="1.4" />
          <path d="m2.4 4 5.6 4.6L13.6 4" />
        </>
      )}
      {kind === "whatsapp" && (
        <>
          <path d="M8 1.8a6.2 6.2 0 0 0-5.4 9.3L1.8 14.2l3.2-.8A6.2 6.2 0 1 0 8 1.8Z" />
          <path d="M5.8 5.2c0 2.6 2.4 5 5 5l.6-1.2-1.4-.8-.7.6a3.7 3.7 0 0 1-2.1-2.1l.6-.7-.8-1.4Z" strokeWidth="1.1" />
        </>
      )}
      {kind === "link" && (
        <>
          <path d="M6.6 9.4a2.6 2.6 0 0 0 3.7 0l2.4-2.4a2.6 2.6 0 0 0-3.7-3.7l-.9.9" />
          <path d="M9.4 6.6a2.6 2.6 0 0 0-3.7 0L3.3 9a2.6 2.6 0 0 0 3.7 3.7l.9-.9" />
        </>
      )}
      {kind === "address" && (
        <>
          <path d="M8 14.4s4.8-4.3 4.8-8a4.8 4.8 0 0 0-9.6 0c0 3.7 4.8 8 4.8 8Z" />
          <circle cx="8" cy="6.4" r="1.7" />
        </>
      )}
    </svg>
  );
}
