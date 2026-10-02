import { PosterView } from "./PosterView";
import { TemporalFormModal } from "./TemporalForm";
import { AttachmentViewer } from "./AttachmentViewer";
import { PostedOverlay } from "./PostedOverlay";
import { ClearedOverlay } from "./ClearedOverlay";
import { TemporalWatcher } from "./TemporalWatcher";
import "../temporal.css";

/** Ventanas, animaciones y recordatorios de los encargos temporales, por encima de todo lo demás. */
export function TemporalOverlays() {
  return (
    <>
      <PosterView />
      <TemporalFormModal />
      <AttachmentViewer />
      <PostedOverlay />
      <ClearedOverlay />
      <TemporalWatcher />
    </>
  );
}
