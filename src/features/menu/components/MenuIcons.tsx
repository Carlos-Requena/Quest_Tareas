// Iconos propios del menú. Los de cada sección (farol, yelmo, bolsa, diario, calavera…) son los
// de su funcionalidad: el menú los reutiliza para que cada tarjeta lleve el logo de siempre.

/** Cuatro rombos, como las gemas del tablón: el botón del menú. */
export function MenuIcon() {
  const at: [number, number][] = [
    [4.6, 4.6],
    [11.4, 4.6],
    [4.6, 11.4],
    [11.4, 11.4],
  ];
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className="menu-icon">
      {at.map(([x, y], i) => (
        <rect
          key={i}
          x={x - 2.3}
          y={y - 2.3}
          width="4.6"
          height="4.6"
          transform={`rotate(45 ${x} ${y})`}
          fill={i === 0 ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.1"
        />
      ))}
    </svg>
  );
}

/** Libro abierto: el almanaque. */
export function AlmanacIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
      <path d="M8 4C6.4 3 4.4 2.6 2 2.8v9.4c2.4-.2 4.4.2 6 1.2 1.6-1 3.6-1.4 6-1.2V2.8C11.6 2.6 9.6 3 8 4Z" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M8 4v9.4" stroke="currentColor" strokeWidth="1" />
      <path d="M10 6.2h2.4M10 8.4h2.4M3.6 6.2H6M3.6 8.4H6" stroke="currentColor" strokeWidth=".8" strokeLinecap="round" />
    </svg>
  );
}

/** Reloj pequeño: lo que falta para que cambie el escaparate. */
export function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <circle cx="6" cy="6" r="4.8" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <path d="M6 3.2V6l2 1.3" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

/** Dos flechas que se cruzan: cambiar de personaje. */
export function SwapIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <path d="M1.5 4h8l-2-2M10.5 8h-8l2 2" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Flecha de volver. */
export function BackIcon() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden>
      <path d="M8 2 2 8l6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Sello del gremio detrás del personaje: círculos con marcas y el rombo del tablón, a gran tamaño.
 * Gira muy despacio (CSS); es solo decoración.
 */
export function Sigil() {
  const ticks = Array.from({ length: 48 }, (_, i) => i * 7.5);
  return (
    <svg viewBox="0 0 200 200" aria-hidden className="mn-sigil-svg">
      <circle cx="100" cy="100" r="96" fill="none" stroke="currentColor" strokeWidth=".5" />
      <circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2 5" />
      {ticks.map((a) => (
        <path key={a} d="M100 6v6" stroke="currentColor" strokeWidth={a % 45 === 0 ? 1.6 : 0.6} transform={`rotate(${a} 100 100)`} />
      ))}
      <circle cx="100" cy="100" r="70" fill="none" stroke="currentColor" strokeWidth=".6" />
      <rect x="50" y="50" width="100" height="100" transform="rotate(45 100 100)" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <rect x="62" y="62" width="76" height="76" transform="rotate(45 100 100)" fill="none" stroke="currentColor" strokeWidth=".5" />
      <rect x="66" y="66" width="68" height="68" fill="none" stroke="currentColor" strokeWidth=".5" />
      <circle cx="100" cy="100" r="26" fill="none" stroke="currentColor" strokeWidth=".8" />
      <path d="M100 30v140M30 100h140" stroke="currentColor" strokeWidth=".4" />
    </svg>
  );
}
