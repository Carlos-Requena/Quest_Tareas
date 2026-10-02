import type { GearSlot } from "../model";

/** Trazos de cada ranura (24 × 24). Se usan en las ranuras vacías y en las piezas sin imagen. */
const GLYPHS: Record<GearSlot, string[]> = {
  head: ["M5 19v-6a7 7 0 0 1 14 0v6h-4v-4H9v4z", "M12 6V2.5", "M12 9.5v3.5"],
  body: ["M8 4l4 2 4-2 4 3-2 4v9H6v-9L4 7z", "M12 6v14", "M7 11h10"],
  hands: ["M8 21v-5L6 12V7a1.5 1.5 0 0 1 3 0v3V5a1.5 1.5 0 0 1 3 0v5V6a1.5 1.5 0 0 1 3 0v5l2-2a1.5 1.5 0 0 1 2 2l-4 5v5z", "M8 18h7"],
  feet: ["M8 3h6v10l5 3v4H6v-4l2-3z", "M6 17h13", "M8 8h6"],
  weapon: ["M20 4l-1 4-8 8-3-3 8-8z", "M6 12l6 6", "M8.5 15.5l-4 4", "M14 6l4 4"],
  shield: ["M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z", "M12 7v10", "M8.5 11h7"],
  cape: ["M8 4h8l1 3 3 13H4L7 7z", "M10 4l2 4 2-4", "M9 12l-1 8M15 12l1 8"],
  amulet: ["M6 3c0 5 3 8 6 9 3-1 6-4 6-9", "M12 12l3 4-3 5-3-5z"],
  backdrop: ["M3 5h18v14H3z", "M3 16l5-5 4 4 3-3 6 6", "M16 8.5a1.5 1.5 0 1 0 0 .01"],
  emblem: ["M12 2l9 10-9 10-9-10z", "M12 7l4.5 5-4.5 5-4.5-5z"],
};

export function SlotGlyph({ slot, className }: { slot: GearSlot; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" aria-hidden>
      {(GLYPHS[slot] ?? GLYPHS.emblem).map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
