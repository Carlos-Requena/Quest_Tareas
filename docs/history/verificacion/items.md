# Historial de verificación · Objetos: inventario, almanaque y drops

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/items/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## Registro hasta el 2026-10-07

Hecho el 2026-10-01 con `pnpm dev` en el navegador integrado (viewport de 1280 × 780):

- **Distribución** (200.000 tiradas con semilla, sin pity): estándar 50 / 28,1 / 13 / 6 / 2,4 / 0,58 %; élite 29,8 / 30 / 20,1 / 12 / 6 / 1,97 %.
- **Pity** (100.000 tiradas encadenadas): media de 62,3 tiradas por legendario, máximo 87; nunca más de 9 seguidas sin épico o superior. `legendaryChance`: 0,6 % hasta la 73, 6,6 % en la 74, 100 % en la 90.
- **Retroceso de rareza**, élite con 2 tiradas y catálogo sin objetos que puedan salir (sin botín).
- **Proyección** con eventos fijos: conversión de `item` antiguo, `quest_completed` duplicado ignorado (ni XP ni botín), parche por campos, re-creación ignorada y retirada sin resurrección.
- **Datos antiguos** reales del navegador de pruebas (31 eventos v1, objetos en japonés): el inventario y las recompensas se ven como objetos comunes.
- **Instalación nueva:** 10 objetos de ejemplo y quests con objeto garantizado.
- **Interfaz:** crear un objeto legendario con imagen (SVG de 512 px → WebP de 3 KB), almanaque, inventario, filtros por rareza, color al pasar el ratón, probabilidades, «Quest Clear» con garantizado, botín y NEW, formulario de quest en japonés con el selector agrupado por rareza.

Cofre y libro, el 2026-10-02 con el mismo método. El panel del navegador estaba en segundo plano, así que GSAP no avanzaba solo: pausé su reloj global y lo avancé a mano para capturar cada fase.

- **Legendario + mítico + garantizado:** la subida de color va de azul a morado (0,56 s), rojo (0,96 s) y dorado en el estallido. En el estallido había 264 partículas en el cofre y 46 monedas por la pantalla; el rótulo «LEGENDARY!» salía con lluvia de estrellas, y al final los objetos quedaban flotando con rayos.
- **Común:** sin subida de color (gris), con luz blanca y lluvia de monedas.
- **Doble clic** a los 0,3 s ignorado; **salto** pasado el segundo, sin partículas nuevas; el siguiente clic cierra.
- **«Reducir movimiento»** simulado: sin sacudidas y con un tercio de partículas.
- **Libro:** 12 huecos por página; los no conseguidos con el filtro nuevo en lugar del negro.
- Sin errores en consola; `tsc` y `build` correctos.

**No verificado:** ningún sonido nuevo (cofre, monedas, fanfarria, pasar página) se ha escuchado; el giro de página y el libro no se han visto en movimiento; tampoco el rendimiento de tantas partículas en el WKWebView de macOS. Además, la app nativa con SQLite (`pnpm tauri dev`), Windows, la codificación WebP en el WKWebView de macOS (si no la soporta, cae a PNG) y la selección de imagen con el diálogo de archivos real (se probó inyectando el archivo en el `<input>`).
