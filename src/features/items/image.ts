// Reduce la imagen elegida a un icono pequeño y la convierte en data URL.
// La imagen viaja dentro del evento (item_created / item_updated): así se guarda
// en SQLite y se sincronizará con los demás eventos, sin ficheros aparte.
// Usa el DOM (canvas), por eso no está en model.ts.

export const ICON_SIZE = 160;

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
