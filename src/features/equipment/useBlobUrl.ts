import { useEffect, useState } from "react";
import { openBlobStore } from "../../storage/blobStore";

/**
 * URL de un binario del almacén (la imagen grande del fondo). `undefined` mientras carga
 * o si este equipo no tiene el archivo (en la fase 2 puede llegar la referencia antes que el archivo).
 */
export function useBlobUrl(blobId: string | undefined): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    setUrl(undefined);
    if (!blobId) return;
    let alive = true;
    let made: string | undefined;
    openBlobStore()
      .then((s) => s.get(blobId))
      .then((blob) => {
        if (!alive || !blob) return;
        made = URL.createObjectURL(blob);
        setUrl(made);
      })
      .catch((err) => console.error(err));
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [blobId]);
  return url;
}
