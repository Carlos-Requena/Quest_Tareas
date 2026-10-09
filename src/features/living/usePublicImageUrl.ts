import { useEffect, useState } from "react";

/** Convierte un asset público en una URL blob para usar la misma ruta que los binarios del jugador. */
export function usePublicImageUrl(src: string | undefined): string | undefined {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    setUrl(undefined);
    if (!src) return;
    let alive = true;
    let made: string | undefined;
    void fetch(src)
      .then((response) => {
        if (!response.ok) throw new Error(`No se pudo cargar el asset ${src}: ${response.status}`);
        return response.blob();
      })
      .then((blob) => {
        if (!alive) return;
        made = URL.createObjectURL(blob);
        setUrl(made);
      })
      .catch((error) => {
        if (alive) console.error(error);
      });
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [src]);

  return url;
}
