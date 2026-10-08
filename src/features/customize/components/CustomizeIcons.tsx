import type { Daypart } from "../../menu/model";
import type { Situation } from "../../companion/model";

/** Pincel: la tarjeta del menú y la cabecera de la ventana. */
export function BrushIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path d="M12.6 1.4 7.2 7.6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="m6.1 7.4 1.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M5.6 8.3c-1.5-.1-2.6.7-2.9 2-.2.8-.7 1.3-1.4 1.5 1.6.8 4 .6 5-.6.7-.8.6-2-.7-2.9z" fill="currentColor" />
    </svg>
  );
}

/** Retrato en su marco: la pestaña de personajes. */
export function PortraitIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <rect x="2.5" y="1.5" width="11" height="13" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="8" cy="6.4" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <path d="M4.6 14.5c.4-2.4 1.7-3.6 3.4-3.6s3 1.2 3.4 3.6" fill="none" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

/** Pergamino clavado: la pestaña de ilustraciones de encargos. */
export function PosterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path d="M3 2.5h10v9.2l-1.4 1.1-1.2-.9-1.3 1.2-1.3-1-1.4 1.1-1.3-1L3 13.3z" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <circle cx="8" cy="2.5" r="1.1" fill="currentColor" />
      <path d="M5.2 6h5.6M5.2 8.4h3.8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

/** Icono de cada parte del día: sol, sol de tarde, luna y estrellas. */
export function DaypartIcon({ part }: { part: Daypart }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round" as const };
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
      {part === "morning" && (
        <>
          <circle cx="11" cy="11" r="3.6" {...common} />
          {Array.from({ length: 8 }, (_, i) => (
            <path key={i} d="M11 2.6v2.2" {...common} transform={`rotate(${i * 45} 11 11)`} />
          ))}
        </>
      )}
      {part === "afternoon" && (
        <>
          <path d="M5 14.5a6 6 0 0 1 12 0" {...common} />
          <path d="M2.5 14.5h17M5.5 17.5h11" {...common} />
          {[-60, -30, 0, 30, 60].map((a) => (
            <path key={a} d="M11 4.4v1.8" {...common} transform={`rotate(${a} 11 14.5)`} />
          ))}
        </>
      )}
      {part === "evening" && <path d="M14.8 4.2a7 7 0 1 0 3 10.6A5.6 5.6 0 0 1 14.8 4.2z" {...common} strokeLinejoin="round" />}
      {part === "night" && (
        <>
          <path d="M8 3.5l1 2.6 2.6 1-2.6 1L8 10.7l-1-2.6-2.6-1 2.6-1z" {...common} strokeLinejoin="round" />
          <path d="M15.5 10l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" {...common} strokeLinejoin="round" />
          <circle cx="6.5" cy="16" r=".8" fill="currentColor" />
          <circle cx="17" cy="5" r=".7" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

/** Icono de cada situación de «Mi día»: reloj de arena, llama, espadas, cartel, grieta, estandarte y hoja. */
export function SituationIcon({ situation }: { situation: Situation }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
      {situation === "tonight" && <path d="M6 3h10M6 19h10M7 3c0 4 8 5 8 8s-8 4-8 8M15 3c0 4-8 5-8 8s8 4 8 8" {...common} />}
      {situation === "streak" && <path d="M11 19c-3.3 0-5.5-2.2-5.5-5.2 0-3.4 3-4.8 3.4-8.8 2.4 1.6 3.4 3.8 3.1 6 1-.6 1.7-1.6 1.9-2.9 1.8 1.6 2.6 3.4 2.6 5.6 0 3-2.2 5.3-5.5 5.3z" {...common} />}
      {situation === "active" && (
        <>
          <path d="M4 4l10 10M18 4L8 14" {...common} />
          <path d="M12.5 15.5l2 2M9.5 15.5l-2 2M4 17.5l2 1M18 17.5l-2 1" {...common} />
        </>
      )}
      {situation === "due" && (
        <>
          <path d="M5 4.5h12v13H5z" {...common} />
          <circle cx="11" cy="4.5" r="1" fill="currentColor" />
          <path d="M8 9h6M8 12h4" {...common} />
        </>
      )}
      {situation === "failed" && (
        <>
          <path d="M5 4.5h12v13H5z" {...common} />
          <path d="M12 4.5l-2 4 3 2.5-2.5 3.5 1 3" {...common} />
        </>
      )}
      {situation === "clear" && (
        <>
          <path d="M6 19V3.5M6 4h10l-2.2 3.2L16 10.5H6" {...common} />
          <path d="M8.5 7.2l1.3 1.3 2.6-2.8" {...common} />
        </>
      )}
      {situation === "quiet" && <path d="M5 17c0-7 5-11 12-12-.5 7-4.5 12-12 12zM5 17l6-6" {...common} />}
    </svg>
  );
}

/** Lápiz y papelera de las frases. */
export function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path d="M9.6 2.2 11.8 4.4 5 11.2l-2.8.6.6-2.8z" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path d="M2.5 3.8h9M5.6 3.6V2.2h2.8v1.4M3.8 3.8l.6 8h5.2l.6-8M6 6v4M8 6v4" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
