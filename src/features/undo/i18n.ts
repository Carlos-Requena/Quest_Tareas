// Textos de deshacer. Se montan bajo la clave `undo` en src/i18n/locales/{es,ja}.ts.

export const undoEs = {
  action: "Deshacer",
  done: "Deshecho: {{what}}",
  expired: "Ya no se puede deshacer: han pasado más de 15 minutos",
  nothing: "No hay nada que deshacer",
  key: "Deshacer",
};

export const undoJa: typeof undoEs = {
  action: "元に戻す",
  done: "元に戻しました：{{what}}",
  expired: "15分以上たったため、元に戻せません",
  nothing: "元に戻せる操作はありません",
  key: "元に戻す",
};
