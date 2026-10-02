// Dónde se guarda el snapshot: fila `snapshot` de la tabla meta de quests.db (Tauri)
// o `quests.snapshot` en localStorage (navegador, solo desarrollo).
// Es una caché: si no se puede leer o escribir, la app recalcula desde los eventos.

import { isTauri, sqliteDb } from "../../storage/eventStore";
import { decodeSnapshot, encodeSnapshot, type Snapshot } from "./model";

const KEY = "snapshot";
const LOCAL_KEY = "quests.snapshot";

export async function readSnapshot(): Promise<Snapshot | undefined> {
  try {
    if (!isTauri()) return decodeSnapshot(localStorage.getItem(LOCAL_KEY));
    const db = await sqliteDb();
    const rows = await db.select<{ value: string }[]>("SELECT value FROM meta WHERE key = $1", [KEY]);
    return decodeSnapshot(rows[0]?.value);
  } catch (err) {
    console.warn("[snapshot] no se pudo leer; se recalcula desde los eventos", err);
    return;
  }
}

export async function writeSnapshot(s: Snapshot): Promise<void> {
  try {
    const text = encodeSnapshot(s);
    if (!isTauri()) return localStorage.setItem(LOCAL_KEY, text);
    const db = await sqliteDb();
    await db.execute("INSERT OR REPLACE INTO meta (key, value) VALUES ($1, $2)", [KEY, text]);
  } catch (err) {
    // localStorage lleno, por ejemplo: sin snapshot la app funciona igual, solo arranca más despacio.
    console.warn("[snapshot] no se pudo guardar", err);
  }
}
