// Modelo puro de la pantalla de recuperación: qué se muestra y qué se copia de un fallo.

export interface Failure {
  message: string;
  /** Pila de llamadas de JavaScript y de componentes de React, si las hay. */
  stack: string;
}

/** Convierte lo que se haya lanzado (Error, texto, cualquier cosa) en algo que se pueda mostrar. */
export function describeFailure(error: unknown, componentStack?: string | null): Failure {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const js = error instanceof Error && error.stack ? error.stack : "";
  return { message, stack: [js, componentStack?.trim() ?? ""].filter(Boolean).join("\n\nReact:\n") };
}

/** Texto para copiar e informar del fallo: versión, navegador, hora y la pila. */
export function failureReport(f: Failure, meta: { version: string; userAgent: string; at: number }): string {
  return [
    `Quests ${meta.version} — ${new Date(meta.at).toISOString()}`,
    meta.userAgent,
    "",
    f.message,
    f.stack,
  ].join("\n");
}
