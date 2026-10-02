# Quests — instrucciones para agentes

Este proyecto tiene una guía de trabajo obligatoria para cualquier agente: **[docs/AGENTES.md](docs/AGENTES.md)**. Léela entera antes de hacer cambios.

Resumen de las normas principales (el detalle está en la guía):

1. **Event sourcing:** todo cambio de estado pasa por `dispatch(evento)`; los eventos guardados son inmutables. Si cambia un formato, los datos antiguos se convierten al leerlos (ver `src/features/pomodoro/legacy.ts`).
2. **Dominio puro:** `src/domain/` y los `model.ts` de las funcionalidades no importan React, Zustand, Tauri ni el DOM, y no llaman a `Date.now()` (el tiempo entra como parámetro).
3. **Una carpeta por implementación:** cada funcionalidad nueva va en `src/features/<nombre>/` con su `README.md`; la integración fuera de la carpeta es mínima.
4. **Textos con i18n:** todo texto visible usa `t()`, con claves en `src/i18n/locales/es.ts` y `ja.ts`.
5. **Assets en `public/`**, nunca en `dist/` (se borra en cada build).
6. **Verificar antes de terminar:** `npx tsc --noEmit`, `pnpm build` y prueba en ejecución; informar de lo que no se pudo probar.
7. **Documentación al día:** el README de la funcionalidad, `docs/COMO-FUNCIONA.md` y el informe (`docs/INFORME-TECNICO.md`) cuando cambie el modelo.

Documentación: [docs/INFORME-TECNICO.md](docs/INFORME-TECNICO.md) · [docs/COMO-FUNCIONA.md](docs/COMO-FUNCIONA.md) · [README.md](README.md)
