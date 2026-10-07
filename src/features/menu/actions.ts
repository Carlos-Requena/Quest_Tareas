// Casos de uso del menú de opciones: abrirlo, cerrarlo e ir desde él a cada sitio. Sin eventos:
// solo cambia qué se ve. Las ventanas (mercader, personaje, objetos, crónica) se abren encima
// del menú y, al cerrarlas, se vuelve a él, como en el menú principal de un gacha.

import { useGame, type Section } from "../../store/game";
import { sfx } from "../../lib/sfx";
import { uid } from "../../lib/id";
import i18n from "../../i18n";
import { openBlobStore } from "../../storage/blobStore";
import { gearBlobIds } from "../merchant/model";
import { liveBlobIds } from "../temporal/model";
import { switchSection, temporalBusy } from "../temporal";
import { merchantBusy } from "../merchant/ui";
import { characterBusy } from "../equipment/ui";
import { chronicleBusy } from "../chronicle/ui";
import { calendarBusy } from "../calendar/ui";
import { editingBusy } from "../editing/ui";
import { failureBusy } from "../failure/ui";
import { quickBusy } from "../quickadd/ui";
import { searchBusy } from "../search/ui";
import { openSearch } from "../search/actions";
import { BUILTIN_PREFIX, CHARACTER_LIMITS, characterBlobIds, dayNumber, type CharacterDef } from "./model";
import { nameFromFile, prepareCharacter } from "./image";
import { menuBusy, useMenuUi } from "./ui";

/** Abre el menú con su barrido (botón de la cabecera, tecla O o la barra del teléfono). */
export function openMenu() {
  if (menuBusy()) return;
  sfx.menuOpen();
  useMenuUi.getState().setOpen(true);
}

export function closeMenu() {
  if (!menuBusy()) return;
  sfx.menuClose();
  useMenuUi.getState().setOpen(false);
}

export const toggleMenu = () => (menuBusy() ? closeMenu() : openMenu());

/** Va a una sección (tablón de quests, encargos o calendario) y cierra el menú. */
export function goTo(section: Section) {
  useMenuUi.getState().setOpen(false);
  if (useGame.getState().section === section) sfx.menuClose();
  else switchSection(section);
}

/** Abre una ventana encima del menú: al cerrarla se vuelve aquí. */
export function openOver(open: () => void) {
  sfx.move();
  open();
}

/** La búsqueda lleva a otro sitio (una quest, un encargo, un día): el menú se cierra antes. */
export function searchFromMenu() {
  useMenuUi.getState().setOpen(false);
  openSearch();
}

/**
 * Hay una ventana abierta encima del menú: su teclado manda (Escape la cierra a ella, no al
 * menú). Es la misma lista que mira App.tsx para el teclado del tablón.
 */
export function windowOpen(): boolean {
  const s = useGame.getState();
  return (
    s.creating ||
    !!s.clear ||
    !!s.collection ||
    temporalBusy() ||
    merchantBusy() ||
    characterBusy() ||
    chronicleBusy() ||
    calendarBusy() ||
    editingBusy() ||
    failureBusy() ||
    searchBusy() ||
    quickBusy()
  );
}

// ───────────── Personajes ─────────────

/**
 * Elige el personaje de hoy en este equipo (sin id: vuelve al de la rotación). No cambia la
 * rotación: mañana sale el que tocaba, como si no se hubiera elegido.
 */
export function pickCharacter(id?: string) {
  sfx.move();
  useMenuUi.getState().setPick(id ? { day: dayNumber(Date.now()), id } : undefined);
}

/**
 * Añade un personaje con la imagen que elige el jugador: el archivo va al almacén de binarios
 * y el evento lleva su referencia y una miniatura (se sincroniza). Queda elegido para hoy.
 */
export async function addCharacter(file: File): Promise<string | undefined> {
  const { dispatch, say } = useGame.getState();
  let images;
  try {
    images = await prepareCharacter(file);
  } catch {
    sfx.cancel();
    say(() => i18n.t("menu.cast.toast.bad"));
    return undefined;
  }
  const blobId = await (await openBlobStore()).put(images.art);
  const name = nameFromFile(file.name).slice(0, CHARACTER_LIMITS.name) || i18n.t("menu.cast.unnamed");
  const character: CharacterDef = {
    id: uid(),
    name,
    art: { blobId, mime: images.art.type, size: images.art.size },
    thumb: images.thumb,
    createdAt: Date.now(),
  };
  await dispatch({ type: "character_added", character });
  sfx.tick();
  useMenuUi.getState().setPick({ day: dayNumber(Date.now()), id: character.id });
  say(() => i18n.t("menu.cast.toast.added", { name }));
  return character.id;
}

/** Quita un personaje añadido (los de serie no se quitan: están en public/menu/). Borra su imagen si nadie más la usa. */
export async function removeCharacter(id: string) {
  const { state, dispatch, say } = useGame.getState();
  const cur = state.characters.get(id);
  if (!cur || id.startsWith(BUILTIN_PREFIX)) return;
  sfx.cancel();
  await dispatch({ type: "character_removed", characterId: id });
  if (useMenuUi.getState().pick?.id === id) useMenuUi.getState().setPick(undefined);
  const after = useGame.getState().state;
  const live = liveBlobIds(after.temporals.values());
  for (const b of gearBlobIds(after.gear.values())) live.add(b);
  for (const b of characterBlobIds(after.characters.values())) live.add(b);
  if (!live.has(cur.art.blobId)) await (await openBlobStore()).remove(cur.art.blobId);
  say(() => i18n.t("menu.cast.toast.removed", { name: cur.name }));
}
