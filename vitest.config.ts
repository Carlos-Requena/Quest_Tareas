import { defineConfig } from "vitest/config";

// Tests (pnpm test). Zona horaria fija: los plazos, «hoy» y los cambios de hora
// dependen de ella, y los resultados tienen que ser iguales en cualquier equipo.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    env: { TZ: "Europe/Madrid" },
  },
});
