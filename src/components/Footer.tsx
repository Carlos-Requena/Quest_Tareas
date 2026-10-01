import { useGame } from "../store/game";

function Key({ k, label }: { k: string; label: string }) {
  return (
    <span className="ft-key">
      <kbd>{k}</kbd>
      {label}
    </span>
  );
}

export function Footer() {
  const setCreating = useGame((s) => s.setCreating);
  return (
    <footer className="ft">
      <Key k="Enter" label="Aceptar / Reportar" />
      <Key k="X" label="Abandonar" />
      <Key k="+" label="Progreso" />
      <Key k="Q E" label="Categoría" />
      <button className="ft-new" onClick={() => setCreating(true)}>
        <kbd>N</kbd>Nueva quest
      </button>
      <span className="ft-right muted">↑↓←→ Tablón</span>
    </footer>
  );
}
