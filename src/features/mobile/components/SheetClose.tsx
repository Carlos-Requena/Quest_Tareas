import { useTranslation } from "react-i18next";
import { sfx } from "../../../lib/sfx";

/** ✕ de la ficha que sube desde abajo (mercader, inventario): la cierra sin salir de la ventana. Solo en el teléfono. */
export function SheetClose({ onClose }: { onClose(): void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="m-sheet-x"
      aria-label={t("mobile.closeSheet")}
      onClick={() => {
        sfx.move();
        onClose();
      }}
    >
      ✕
    </button>
  );
}
