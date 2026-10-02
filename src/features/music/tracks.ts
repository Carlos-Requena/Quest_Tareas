// Pistas de música de fondo. Los archivos viven en public/music/ y Vite los
// copia tal cual a dist/music/ en cada build (dist/ se regenera entera).

export const TRACKS = [{ id: "tavern", file: "酒場.mp3" }] as const;

export type TrackId = (typeof TRACKS)[number]["id"];

export const DEFAULT_TRACK: TrackId = "tavern";

export function trackUrl(id: TrackId): string {
  const t = TRACKS.find((x) => x.id === id) ?? TRACKS[0];
  return `${import.meta.env.BASE_URL}music/${encodeURIComponent(t.file)}`;
}
