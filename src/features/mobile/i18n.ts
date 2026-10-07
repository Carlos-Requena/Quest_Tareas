// Textos de la interfaz de teléfono. Se montan bajo la clave `mobile` en src/i18n/locales/{es,ja}.ts.
// Lo que ya existe en otras funcionalidades (nombres del mercader, del personaje…) se reutiliza.

export const mobileEs = {
  nav: {
    label: "Navegación",
    board: "Tablón",
    temporal: "Encargos",
  },
  back: "Volver al tablón",
  touch: {
    continue: "Toca para continuar",
    skip: "Toca para saltar",
    openChest: "Toca el cofre para abrirlo",
    pin: "Toca el rombo dorado para clavar uno: una cita, una entrega, un examen…",
  },
};

export const mobileJa: typeof mobileEs = {
  nav: {
    label: "ナビゲーション",
    board: "掲示板",
    temporal: "依頼",
  },
  back: "掲示板に戻る",
  touch: {
    continue: "タップして続ける",
    skip: "タップでスキップ",
    openChest: "宝箱をタップして開ける",
    pin: "金色のひし形をタップして依頼を貼り出せます。診察、届け物、試験…",
  },
};
