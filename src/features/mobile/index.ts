// API pública de la interfaz de teléfono (sin eventos: solo presentación).
export { PHONE_MAX_WIDTH, PHONE_QUERY, isPhone, useIsPhone } from "./phone";
export { useMobileUi } from "./ui";
export { detailPrimaryAction, swipeAction, SHEET_MS } from "./actions";
export { MobileNav, MobileCreate } from "./components/MobileNav";
export { DetailBack } from "./components/DetailBack";
export { SheetClose } from "./components/SheetClose";
export { SheetGrip } from "./components/SheetGrip";
export { useDragDismiss } from "./drag";
export { useSwipe } from "./swipe";
export { KeyHint, type TouchHint } from "./components/KeyHint";
