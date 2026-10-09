import { useTranslation } from "react-i18next";

/**
 * Asa de una hoja que sube desde abajo: la franja de arriba con la rayita de iOS. Arrastrarla hacia
 * abajo cierra la hoja (useDragDismiss con `handle`). Solo en el teléfono.
 */
export function SheetGrip() {
  const { t } = useTranslation();
  return (
    <div className="m-grip" data-drag-handle role="presentation" title={t("mobile.dragToClose")}>
      <span />
    </div>
  );
}
