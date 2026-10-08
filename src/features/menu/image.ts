// Prepara la imagen de un personaje que añade el jugador. Usa el DOM (canvas), por eso no
// está en model.ts. La imagen grande va al almacén de binarios y en el evento viaja solo su
// referencia y una miniatura (ADR-11), como el fondo del mercader.
//
// Lo importante es la transparencia (el personaje se pinta sobre el fondo del menú): un WebP,
// PNG o AVIF razonable se guarda tal cual, sin volver a codificarlo; uno grande se reduce y
// se guarda en WebP si el WebView sabe codificarlo, o en PNG (nunca en JPEG). Una imagen
// animada (GIF, APNG, WebP o AVIF) y un vídeo (WebM, MP4 o MOV) se guardan tal cual: un
// canvas se quedaría con el primer fotograma. Su miniatura es ese primer fotograma.

import { acceptedVideo, isAnimatedImage } from "./media";

/** Lado mayor de la imagen guardada y alto de la miniatura, en píxeles. */
export const ART_SIDE = 1800;
export const THUMB_HEIGHT = 160;
/** Más grande que esto se reduce; un archivo de más de MAX_INPUT ni se intenta. */
export const KEEP_BYTES = 5 * 1024 * 1024;
export const MAX_INPUT = 25 * 1024 * 1024;
/** Una imagen animada o un vídeo no se pueden reducir: más grandes que esto, no se aceptan. */
export const MAX_ANIMATED = 30 * 1024 * 1024;
const KEEP_TYPES = ["image/webp", "image/png", "image/avif"];

export interface CharacterImages {
  art: Blob;
  thumb: string;
  /** Se mueve por sí misma (imagen animada o vídeo): se pinta tal cual, sin la malla de features/living. */
  animated: boolean;
}

/** Por qué no se pudo preparar: no es una imagen o un vídeo que se sepa leer, o es demasiado grande. */
export type MediaError = "bad" | "big";

function load(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    img.src = url;
  });
}

function draw(img: HTMLImageElement | HTMLVideoElement, scale: number): HTMLCanvasElement {
  const [w, h] = img instanceof HTMLVideoElement ? [img.videoWidth, img.videoHeight] : [img.naturalWidth, img.naturalHeight];
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round((w || 1) * scale));
  canvas.height = Math.max(1, Math.round((h || 1) * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** WebP con transparencia si el WebView sabe codificarlo; si no, PNG. */
function encode(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (webp) => {
        if (webp?.type === "image/webp") return resolve(webp);
        canvas.toBlob((png) => (png ? resolve(png) : reject(new Error("image"))), "image/png");
      },
      "image/webp",
      0.9,
    ),
  );
}

/** Primer fotograma de un vídeo (un poco después del principio, que a veces es negro). */
function loadVideo(file: Blob): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    const done = (ok: boolean) => {
      clearTimeout(timer);
      v.onseeked = v.onerror = v.onloadeddata = null;
      URL.revokeObjectURL(url);
      if (ok && v.videoWidth) resolve(v);
      else reject(new Error("image"));
    };
    const timer = setTimeout(() => done(false), 15_000);
    v.onloadeddata = () => {
      v.onseeked = () => done(true);
      v.currentTime = Math.min(0.1, (v.duration || 0) / 2);
    };
    v.onerror = () => done(false);
    v.src = url;
  });
}

/** Miniatura de unos THUMB_HEIGHT px de alto, en WebP si se puede (con transparencia) o PNG. */
function thumbOf(img: HTMLImageElement | HTMLVideoElement): string {
  const h = img instanceof HTMLVideoElement ? img.videoHeight : img.naturalHeight;
  const small = draw(img, Math.min(1, THUMB_HEIGHT / (h || 1)));
  const webp = small.toDataURL("image/webp", 0.85);
  return webp.startsWith("data:image/webp") ? webp : small.toDataURL("image/png");
}

/** Imagen (o vídeo) grande y miniatura de un archivo elegido por el jugador. Falla con un `MediaError`. */
export async function prepareCharacter(file: File): Promise<CharacterImages> {
  if (acceptedVideo(file.type)) {
    if (file.size > MAX_ANIMATED) throw "big" satisfies MediaError;
    const video = await loadVideo(file).catch(() => {
      throw "bad" satisfies MediaError;
    });
    return { art: file, thumb: thumbOf(video), animated: true };
  }
  if (!file.type.startsWith("image/")) throw "bad" satisfies MediaError;
  const head = new Uint8Array(await file.slice(0, 256 * 1024).arrayBuffer());
  const animated = isAnimatedImage(head);
  if (file.size > (animated ? MAX_ANIMATED : MAX_INPUT)) throw "big" satisfies MediaError;
  const img = await load(file).catch(() => {
    throw "bad" satisfies MediaError;
  });
  if (animated) return { art: file, thumb: thumbOf(img), animated: true };
  const side = Math.max(img.naturalWidth, img.naturalHeight) || 1;
  const keep = KEEP_TYPES.includes(file.type) && file.size <= KEEP_BYTES && side <= ART_SIDE * 1.5;
  const art = keep ? file : await encode(draw(img, Math.min(1, ART_SIDE / side)));
  return { art, thumb: thumbOf(img), animated: false };
}

/** Nombre a partir del archivo: «megumin_casual.webp» → «Megumin casual». */
export function nameFromFile(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return base ? base[0].toUpperCase() + base.slice(1) : "";
}
