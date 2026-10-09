// De la imagen elegida salen dos: un icono pequeño como data URL, que viaja dentro del
// evento (item_created / item_updated) y basta para las fichas, y una versión nítida que va
// al almacén de binarios (el evento lleva su referencia) para las vistas grandes: el icono
// ampliado se veía pixelado en la oferta de Hu Tao del teléfono.
// Usa el DOM (canvas), por eso no está en model.ts.

export const ICON_SIZE = 160;
/** Lado mayor de la imagen nítida: la oferta del teléfono mide unos 160 px de CSS, ×3 en un iPhone. */
export const ART_SIZE = 512;

function load(file: File): Promise<HTMLImageElement> {
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

/** Cabe en ICON_SIZE × ICON_SIZE manteniendo la proporción y la transparencia. */
export async function fileToIcon(file: File): Promise<string> {
  const img = await load(file);
  const w = img.naturalWidth || ICON_SIZE;
  const h = img.naturalHeight || ICON_SIZE;
  const scale = Math.min(1, ICON_SIZE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  // WebP pesa menos; si el WebView no sabe codificarlo (Safari antiguo), devuelve PNG.
  const webp = canvas.toDataURL("image/webp", 0.86);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png");
}

/** La imagen nítida (lado mayor ≤ ART_SIZE), en WebP con transparencia si se puede o PNG. */
export async function fileToArt(file: File): Promise<Blob> {
  const img = await load(file);
  const side = Math.max(img.naturalWidth, img.naturalHeight) || ART_SIZE;
  const scale = Math.min(1, ART_SIZE / side);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round((img.naturalWidth || ART_SIZE) * scale));
  canvas.height = Math.max(1, Math.round((img.naturalHeight || ART_SIZE) * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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
