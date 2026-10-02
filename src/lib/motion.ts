// Transiciones de Motion que comparten varias ventanas.

/** Salida de las ventanas (mercader, personaje, objetos, crónica, formularios): con duración fija. */
export const MODAL_EXIT = { duration: 0.18 } as const;

/**
 * Salida del fondo de una ventana: deja de recibir clics en cuanto empieza a irse. Hasta que
 * terminan las animaciones de dentro (el muñeco, Hu Tao…) el fondo, ya invisible, sigue
 * encima hasta 1,4 s y se tragaba el clic siguiente (en el teléfono, el primer toque en la barra).
 */
export const BACKDROP_EXIT = { opacity: 0, pointerEvents: "none", transition: MODAL_EXIT } as const;
