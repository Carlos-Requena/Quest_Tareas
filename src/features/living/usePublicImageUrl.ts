import { useEffect, useState } from "react";

/**
 * URLs `blob:` de los assets públicos ya convertidos, por ruta. Se guardan mientras dure la app:
 * los de serie son pocos, y así abrir el menú otra vez no vuelve a descargar la imagen ni a
 * decodificarla (una URL nueva es otra imagen para WebKit), que es lo que hacía saltar el barrido.
 */
const urls = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

function load(src: string): Promise<string> {
  let p = pending.get(src);
  if (!p) {
    p = fetch(src)
      .then((response) => {
        if (!response.ok) throw new Error(`No se pudo cargar el asset ${src}: ${response.status}`);
        return response.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        urls.set(src, url);
        return url;
      })
      .finally(() => pending.delete(src));
    pending.set(src, p);
  }
  return p;
}

/**
 * Deja convertida y decodificada la imagen de un asset público antes de que haga falta (el
 * personaje del día, al poco de arrancar): así la primera vez que se abre el menú tampoco salta.
 */
export function preloadPublicImage(src: string): void {
  if (urls.has(src) || pending.has(src)) return;
  load(src)
    .then((url) => {
      const img = new Image();
      img.src = url;
      return img.decode();
    })
    .catch(() => {});
}

/** Convierte un asset público en una URL blob para usar la misma ruta que los binarios del jugador. */
export function usePublicImageUrl(src: string | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(() => (src ? urls.get(src) : undefined));

  useEffect(() => {
    if (!src) {
      setUrl(undefined);
      return;
    }
    const ready = urls.get(src);
    if (ready) {
      setUrl(ready);
      return;
    }
    setUrl(undefined);
    let alive = true;
    load(src)
      .then((made) => {
        if (alive) setUrl(made);
      })
      .catch((error) => {
        if (alive) console.error(error);
      });
    return () => {
      alive = false;
    };
  }, [src]);

  return url;
}
