// Prepara la imagen de un personaje que añade el jugador. Usa el DOM (canvas), por eso no
// está en model.ts. La imagen grande va al almacén de binarios y en el evento viaja solo su
// referencia y una miniatura (ADR-11), como el fondo del mercader.
//
// Lo importante es la transparencia (el personaje se pinta sobre el fondo del menú): un WebP,
// PNG o AVIF razonable se guarda tal cual, sin volver a codificarlo; uno grande se reduce y
// se guarda en WebP si el WebView sabe codificarlo, o en PNG (nunca en JPEG).

/** Lado mayor de la imagen guardada y alto de la miniatura, en píxeles. */
export const ART_SIDE = 1800;
export const THUMB_HEIGHT = 160;
/** Más grande que esto se reduce; un archivo de más de MAX_INPUT ni se intenta. */
export const KEEP_BYTES = 5 * 1024 * 1024;
export const MAX_INPUT = 25 * 1024 * 1024;
const KEEP_TYPES = ["image/webp", "image/png", "image/avif"];

export interface CharacterImages {
  art: Blob;
  thumb: string;
}

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

function draw(img: HTMLImageElement, scale: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
  canvas.height = Math.max(1, Math.round((img.naturalHeight || 1) * scale));
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

/** Imagen grande y miniatura de un archivo elegido por el jugador. Falla si no es una imagen. */
export async function prepareCharacter(file: File): Promise<CharacterImages> {
  if (!file.type.startsWith("image/") || file.size > MAX_INPUT) throw new Error("image");
  const img = await load(file);
  const side = Math.max(img.naturalWidth, img.naturalHeight) || 1;
  const keep = KEEP_TYPES.includes(file.type) && file.size <= KEEP_BYTES && side <= ART_SIDE * 1.5;
  const art = keep ? file : await encode(draw(img, Math.min(1, ART_SIDE / side)));
  const small = draw(img, Math.min(1, THUMB_HEIGHT / (img.naturalHeight || 1)));
  const webp = small.toDataURL("image/webp", 0.85);
  return { art, thumb: webp.startsWith("data:image/webp") ? webp : small.toDataURL("image/png") };
}

/** Nombre a partir del archivo: «megumin_casual.webp» → «Megumin casual». */
export function nameFromFile(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return base ? base[0].toUpperCase() + base.slice(1) : "";
}
