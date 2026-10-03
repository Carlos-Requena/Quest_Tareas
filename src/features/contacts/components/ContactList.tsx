import { useTranslation } from "react-i18next";
import { contactHref, type ContactRef } from "../model";
import { copyContact, openContact } from "../actions";
import { ContactIcon } from "./ContactIcon";
import "../contacts.css";

/**
 * Los contactos de una quest (detalle) o de un encargo (cartel abierto, `paper`): a quién,
 * el dato y un botón para llamar, escribir, abrir o ver en Mapas, más otro para copiarlo.
 */
export function ContactList({ contacts, paper }: { contacts: ContactRef[]; paper?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className={`ct-list ${paper ? "on-paper" : ""}`}>
      {contacts.map((c) => {
        const href = contactHref(c);
        return (
          <div key={c.id} className={`ct-item is-${c.kind}`}>
            <span className="ct-badge" title={t(`contacts.kinds.${c.kind}`)}>
              <ContactIcon kind={c.kind} />
            </span>
            <span className="ct-text">
              {c.name && <b className="ct-who">{c.name}</b>}
              <span className="ct-val">{c.value}</span>
            </span>
            {href && (
              <button className="ct-go" onClick={() => openContact(c)}>
                {t(`contacts.action.${c.kind}`)}
              </button>
            )}
            <button className="ct-copy" title={t("contacts.copy")} aria-label={t("contacts.copy")} onClick={() => copyContact(c)}>
              <svg viewBox="0 0 16 16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.4">
                <rect x="5.2" y="5.2" width="8" height="8.6" rx="1.4" />
                <path d="M10.8 5.2V3.6a1.4 1.4 0 0 0-1.4-1.4H4.2a1.4 1.4 0 0 0-1.4 1.4v6.2a1.4 1.4 0 0 0 1.4 1.4h1" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
