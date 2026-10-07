import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
// @ts-expect-error type error without @types/node package
import process from "node:process";
// @ts-expect-error type error without @types/node package
import { readdirSync } from "node:fs";
const host = process.env.TAURI_DEV_HOST;

/**
 * Personajes de serie del menú (features/menu): los .webp de public/menu/, como el módulo
 * virtual «virtual:menu-characters» (una lista de nombres de archivo). JavaScript no puede
 * listar public/ (import.meta.glob no lo ve), así que lo lee Vite al compilar. Con `pnpm dev`,
 * añadir o quitar un archivo recarga la app.
 */
function menuCharacters(): Plugin {
  const id = "virtual:menu-characters";
  const resolved = "\0" + id;
  const isCharacter = (file: string) => /public[\\/]menu[\\/][^\\/]+\.webp$/i.test(file);
  const list = (): string[] => {
    try {
      return (readdirSync("public/menu") as string[]).filter((f) => /\.webp$/i.test(f)).sort();
    } catch {
      return [];
    }
  };
  return {
    name: "menu-characters",
    resolveId: (source) => (source === id ? resolved : undefined),
    load: (source) => (source === resolved ? `export default ${JSON.stringify(list())};` : undefined),
    configureServer(server) {
      const changed = (file: string) => {
        if (!isCharacter(file)) return;
        const mod = server.moduleGraph.getModuleById(resolved);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.on("add", changed);
      server.watcher.on("unlink", changed);
    },
  };
}

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react(), menuCharacters()],
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
