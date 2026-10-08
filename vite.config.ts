import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
// @ts-expect-error type error without @types/node package
import process from "node:process";
// @ts-expect-error type error without @types/node package
import { readdirSync } from "node:fs";
const host = process.env.TAURI_DEV_HOST;

/**
 * Lista una carpeta de public/ como el módulo virtual «virtual:<name>»: sus rutas relativas
 * a la carpeta (con «/») que cumplen `match`. JavaScript no puede listar public/
 * (import.meta.glob no lo ve), así que lo lee Vite al compilar. Con `pnpm dev`, añadir o
 * quitar un archivo de la carpeta recarga la app.
 */
function publicList(name: string, dir: string, match: RegExp): Plugin {
  const id = `virtual:${name}`;
  const resolved = "\0" + id;
  const root = `public/${dir}`;
  const list = (): string[] => {
    try {
      return (readdirSync(root, { recursive: true }) as string[])
        .map((f) => f.replace(/\\/g, "/"))
        .filter((f) => match.test(f))
        .sort();
    } catch {
      return [];
    }
  };
  return {
    name,
    resolveId: (source) => (source === id ? resolved : undefined),
    load: (source) => (source === resolved ? `export default ${JSON.stringify(list())};` : undefined),
    configureServer(server) {
      const changed = (file: string) => {
        const path = file.replace(/\\/g, "/");
        const at = path.lastIndexOf(`/${root}/`);
        if (at < 0 || !match.test(path.slice(at + root.length + 2))) return;
        const mod = server.moduleGraph.getModuleById(resolved);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.on("add", changed);
      server.watcher.on("unlink", changed);
    },
  };
}

/** Personajes de serie del menú (features/menu): los .webp de public/menu/. */
const menuCharacters = () => publicList("menu-characters", "menu", /^[^/]+\.webp$/i);

/** Ilustraciones de «Encargo cumplido» (features/temporal): public/temporal/<tipo>/*.webp|png. */
const temporalHeroes = () => publicList("temporal-heroes", "temporal", /^[^/]+\/[^/]+\.(webp|png)$/i);

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react(), menuCharacters(), temporalHeroes()],
  // Versión de la app para el informe de la pantalla de recuperación (features/recovery).
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "dev") },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
