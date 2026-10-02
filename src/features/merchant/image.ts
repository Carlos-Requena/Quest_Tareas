// Prepara la imagen de una pieza del mercader. Usa el DOM (canvas), por eso no está en model.ts.
// - Icono de 160 px como data URL: viaja dentro del evento, como la de los objetos (ADR-10).
// - Imagen grande (hasta 1920 px) como Blob: solo para el fondo del menú, que se ve a
//   pantalla completa. Va al almacén de binarios; en el evento, solo su referencia (ADR-11).

export const ICON_SIDE = 160;
export const ART_SIDE = 1920;

export interface GearImages {
  image: string;
  art: Blob;
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

function draw(img: HTMLImageElement, side: number): HTMLCanvasElement {
  const w = img.naturalWidth || side;
  const h = img.naturalHeight || side;
  const scale = Math.min(1, side / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
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

/** Icono (con transparencia) e imagen grande de un archivo elegido por el usuario. */
export async function prepareGearImages(file: File): Promise<GearImages> {
  const img = await load(file);
  const icon = draw(img, ICON_SIDE);
  const webp = icon.toDataURL("image/webp", 0.86);
  const image = webp.startsWith("data:image/webp") ? webp : icon.toDataURL("image/png");
  return { image, art: await encode(draw(img, ART_SIDE), 0.88) };
}
