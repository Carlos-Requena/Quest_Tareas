/** Llama de la racha. `tier` (0–3) cambia el color: brasa, fuego, fuego vivo y llama azul. */
export function Flame({ tier = 0, size = 13 }: { tier?: number; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden className={`flame flame-t${tier}`}>
      <path
        className="flame-out"
        d="M7 .8C7.6 3 10.6 4.6 10.9 8c.3 3.3-1.9 5.2-3.9 5.2S2.8 11.6 3.1 8.6c.2-1.8 1.2-2.6 1.6-3.8.5 1 .6 1.7 1.2 2.1C6 5 5.9 2.9 7 .8z"
      />
      <path className="flame-in" d="M7 6.6c.5 1.2 1.9 2 1.9 3.6 0 1.3-.9 2-1.9 2s-1.9-.7-1.9-1.8c0-1.1.8-1.4 1-2.3.4.5.6.8.9.9z" />
    </svg>
  );
}
