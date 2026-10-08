// Casos de uso del menú de opciones: abrirlo, cerrarlo e ir desde él a cada sitio. Sin eventos:
// solo cambia qué se ve. Las ventanas (mercader, personaje, objetos, crónica) se abren encima
// del menú y, al cerrarlas, se vuelve a él, como en el menú principal de un gacha.

import { useGame, type Section } from "../../store/game";
import { sfx } from "../../lib/sfx";
import { uid } from "../../lib/id";
import i18n from "../../i18n";
import { openBlobStore } from "../../storage/blobStore";
import { blobsInUse } from "../../domain/blobs";
import { switchSection, temporalBusy } from "../temporal";
import { merchantBusy } from "../merchant/ui";
import { characterBusy } from "../equipment/ui";
import { chronicleBusy } from "../chronicle/ui";
import { calendarBusy } from "../calendar/ui";
import { editingBusy } from "../editing/ui";
import { failureBusy } from "../failure/ui";
import { quickBusy } from "../quickadd/ui";
import { searchBusy } from "../search/ui";
import { customizeBusy } from "../customize/ui";
import { openSearch } from "../search/actions";
import { BUILTIN_PREFIX, CHARACTER_LIMITS, cleanVoice, dayNumber, type CharacterDef, type Daypart } from "./model";
import { nameFromFile, prepareCharacter, type MediaError } from "./image";
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
    quickBusy() ||
    customizeBusy()
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
  } catch (err) {
    sfx.cancel();
    const why: MediaError = err === "big" ? "big" : "bad";
    say(() => i18n.t(`menu.cast.toast.${why}`));
    return undefined;
  }
  const blobId = await (await openBlobStore()).put(images.art);
  const name = nameFromFile(file.name).slice(0, CHARACTER_LIMITS.name) || i18n.t("menu.cast.unnamed");
  const character: CharacterDef = {
    id: uid(),
    name,
    art: { blobId, mime: images.art.type, size: images.art.size, ...(images.animated ? { animated: true } : {}) },
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
  if (!blobsInUse(useGame.getState().state).has(cur.art.blobId)) await (await openBlobStore()).remove(cur.art.blobId);
  say(() => i18n.t("menu.cast.toast.removed", { name: cur.name }));
}

// ───────────── Lo que dice cada personaje ─────────────
// Frases escritas por el jugador (ventana de personalización, features/customize). Sin
// límite de frases; cada una, de hasta VOICE_LIMITS.text caracteres. Se sincronizan.

/** Añade una frase a un personaje (de serie o añadido) para una parte del día. `false` si está vacía. */
export async function addVoiceLine(characterId: string, part: Daypart, text: string): Promise<boolean> {
  const clean = cleanVoice(text);
  if (!clean) return false;
  await useGame.getState().dispatch({ type: "voice_line_added", line: { id: uid(), characterId, part, text: clean, createdAt: Date.now() } });
  sfx.tick();
  return true;
}

/** Cambia el texto de una frase. `false` si queda vacía (para quitarla, `removeVoiceLine`). */
export async function updateVoiceLine(lineId: string, text: string): Promise<boolean> {
  const cur = useGame.getState().state.voiceLines.get(lineId);
  const clean = cleanVoice(text);
  if (!cur || !clean) return false;
  if (clean !== cur.text) await useGame.getState().dispatch({ type: "voice_line_updated", lineId, text: clean });
  sfx.tick();
  return true;
}

/** Quita una frase. */
export async function removeVoiceLine(lineId: string) {
  if (!useGame.getState().state.voiceLines.has(lineId)) return;
  sfx.cancel();
  await useGame.getState().dispatch({ type: "voice_line_removed", lineId });
}
