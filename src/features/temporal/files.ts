// Preparación de los archivos adjuntos (PDF e imágenes) antes de guardarlos.
// Usa el DOM (canvas, FileReader), por eso no está en model.ts.

import { TEMPORAL_LIMITS } from "./model";

export const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif,image/bmp";

/** Lado máximo de la imagen guardada: se lee bien un documento fotografiado y no pesa megas. */
const MAX_IMAGE_SIDE = 2400;
/** Lado máximo de la miniatura que viaja dentro del evento. */
const THUMB_SIDE = 320;

/** Un archivo listo para guardar: el binario y lo que irá en la referencia del evento. */
export interface PreparedFile {
  key: string;
  blob: Blob;
  name: string;
  mime: string;
  size: number;
  thumb?: string;
}

export type FileError = "type" | "size" | "image";

/** El tipo real del archivo; algunos sistemas no lo informan y hay que mirar la extensión. */
function mimeOf(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  const byExt: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
    avif: "image/avif",
    bmp: "image/bmp",
  };
  return byExt[ext] ?? "";
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
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

function draw(img: HTMLImageElement, maxSide: number) {
  const w = img.naturalWidth || maxSide;
  const h = img.naturalHeight || maxSide;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("image");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { canvas, scaled: scale < 1 };
}

/** WebP si el WebView sabe codificarlo; si no (Safari antiguo), JPEG. */
function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (webp) => {
        if (webp?.type === "image/webp") return resolve(webp);
        canvas.toBlob((jpg) => (jpg ? resolve(jpg) : reject(new Error("image"))), "image/jpeg", quality);
      },
      "image/webp",
      quality,
    ),
  );
}

function thumbOf(img: HTMLImageElement): string {
  const { canvas } = draw(img, THUMB_SIDE);
  const webp = canvas.toDataURL("image/webp", 0.8);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.8);
}

/**
 * Comprueba y prepara un archivo:
 * - PDF: se guarda tal cual (hasta 20 MB).
 * - Imagen: si es enorme, se reduce a 2400 px de lado; además se saca una miniatura
 *   de 320 px para el cartel. Los SVG se guardan tal cual (en `<img>` no ejecutan scripts).
 */
export async function prepareFile(file: File): Promise<PreparedFile> {
  const mime = mimeOf(file);
  const isPdf = mime === "application/pdf";
  if (!isPdf && !mime.startsWith("image/")) throw "type" satisfies FileError;
  if (file.size > TEMPORAL_LIMITS.fileMb * 1024 * 1024) throw "size" satisfies FileError;
  const key = `${file.name}:${file.size}:${file.lastModified}`;
  if (isPdf) return { key, blob: file.slice(0, file.size, mime), name: file.name, mime, size: file.size };

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    throw "image" satisfies FileError;
  }
  let blob: Blob = file.slice(0, file.size, mime);
  if (mime !== "image/svg+xml" && mime !== "image/gif") {
    const { canvas, scaled } = draw(img, MAX_IMAGE_SIDE);
    if (scaled) blob = await encode(canvas, 0.9);
  }
  return { key, blob, name: file.name, mime: blob.type || mime, size: blob.size, thumb: thumbOf(img) };
}

/** Tamaño legible: 840 KB, 3,2 MB. */
export function formatSize(bytes: number, locale: string): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString(locale)} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString(locale, { maximumFractionDigits: 1 })} MB`;
}
