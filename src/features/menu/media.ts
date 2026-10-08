// Qué clase de archivo es la imagen de un personaje: fija, animada (GIF, APNG, WebP o AVIF
// animados) o vídeo. Puro: mira los primeros bytes del archivo, sin DOM. Una imagen animada
// no se puede reducir con un canvas (se quedaría en su primer fotograma): se guarda tal cual.

export type MediaKind = "image" | "animated" | "video";

const VIDEO_TYPES = ["video/webm", "video/mp4", "video/quicktime"];

export const isVideoMime = (mime: string | undefined) => !!mime && mime.startsWith("video/");

/** ¿Es un vídeo que se acepta? (el navegador decide luego si sabe reproducirlo). */
export const acceptedVideo = (mime: string) => VIDEO_TYPES.includes(mime);

const ascii = (b: Uint8Array, at: number, len: number) => String.fromCharCode(...b.subarray(at, at + len));

/** PNG con un trozo `acTL` antes del primer `IDAT`: APNG. */
function apng(b: Uint8Array): boolean {
  if (ascii(b, 1, 3) !== "PNG") return false;
  let i = 8;
  while (i + 8 <= b.length) {
    const len = ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
    const type = ascii(b, i + 4, 4);
    if (type === "acTL") return true;
    if (type === "IDAT" || type === "IEND") return false;
    i += 12 + len;
  }
  return false;
}

/** WebP extendido (`VP8X`) con la marca de animación, o con un trozo `ANIM`. */
function animatedWebp(b: Uint8Array): boolean {
  if (ascii(b, 0, 4) !== "RIFF" || ascii(b, 8, 4) !== "WEBP") return false;
  if (ascii(b, 12, 4) === "VP8X" && (b[20] & 0x02) !== 0) return true;
  for (let i = 12; i + 4 <= Math.min(b.length, 4096); i++) if (b[i] === 0x41 && ascii(b, i, 4) === "ANIM") return true;
  return false;
}

/** GIF con más de un fotograma (dos descriptores de imagen) o con la extensión de bucle. */
function animatedGif(b: Uint8Array): boolean {
  if (ascii(b, 0, 3) !== "GIF") return false;
  const head = ascii(b, 0, Math.min(b.length, 2048));
  if (head.includes("NETSCAPE2.0") || head.includes("ANIMEXTS1.0")) return true;
  let frames = 0;
  for (let i = 13; i < b.length - 1; i++) if (b[i] === 0x00 && b[i + 1] === 0x2c && ++frames > 1) return true;
  return false;
}

/** AVIF animado: la marca `avis` en la caja `ftyp`. */
function animatedAvif(b: Uint8Array): boolean {
  if (ascii(b, 4, 4) !== "ftyp") return false;
  const size = Math.min(b.length, ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0);
  for (let i = 8; i + 4 <= size; i += 4) if (ascii(b, i, 4) === "avis") return true;
  return false;
}

/** ¿Es una imagen animada? Basta con la cabecera (los primeros KB) salvo en un GIF sin extensión de bucle. */
export function isAnimatedImage(bytes: Uint8Array): boolean {
  return apng(bytes) || animatedWebp(bytes) || animatedGif(bytes) || animatedAvif(bytes);
}
