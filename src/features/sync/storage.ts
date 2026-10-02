// Lo que la sincronización recuerda en este equipo (tabla meta de quests.db): hasta dónde
// leyó el archivo de cada equipo y con qué cuenta está conectado. No va en eventos: es de
// este equipo, como el idioma o la música.

import { sqliteDb } from "../../storage/eventStore";
import { emptyCursors, type Cursors } from "./model";
import type { Account } from "./drive";

const CURSORS = "sync.cursors";
const ACCOUNT = "sync.account";

async function read<T>(key: string): Promise<T | undefined> {
  const db = await sqliteDb();
  const rows = await db.select<{ value: string }[]>("SELECT value FROM meta WHERE key = $1", [key]);
  try {
    return rows[0] ? (JSON.parse(rows[0].value) as T) : undefined;
  } catch {
    return undefined;
  }
}

async function write(key: string, value: unknown | undefined): Promise<void> {
  const db = await sqliteDb();
  if (value === undefined) await db.execute("DELETE FROM meta WHERE key = $1", [key]);
  else await db.execute("INSERT OR REPLACE INTO meta (key, value) VALUES ($1, $2)", [key, JSON.stringify(value)]);
}

export const readCursors = async (): Promise<Cursors> => ({ ...emptyCursors(), ...(await read<Cursors>(CURSORS)) });
export const writeCursors = (c: Cursors) => write(CURSORS, c);
export const readAccount = () => read<Account>(ACCOUNT);
export const writeAccount = (a: Account | undefined) => write(ACCOUNT, a);
/** Al desconectar: con otra cuenta, los archivos son otros y se lee todo de nuevo. */
export const forgetSync = async () => {
  await write(CURSORS, undefined);
  await write(ACCOUNT, undefined);
};
