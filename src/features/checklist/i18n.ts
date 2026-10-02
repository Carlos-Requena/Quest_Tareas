// Textos del objetivo de tipo lista. Se montan bajo la clave `checklist` en src/i18n/locales/{es,ja}.ts.

export const checklistEs = {
  kind: "Lista",
  add: "+ Añadir lista",
  labelPh: "Qué es la lista: «Hacer la maleta»…",
  itemPh: "Casilla {{n}}",
  addItem: "+ Casilla",
  removeItem: "Quitar casilla",
  hint: "Se cumple con todas las casillas marcadas. Pulsa Enter para añadir otra.",
  check: "Marcar",
  uncheck: "Desmarcar",
  count: "{{done}} / {{total}}",
};

export const checklistJa: typeof checklistEs = {
  kind: "チェックリスト",
  add: "+ チェックリストを追加",
  labelPh: "リストの名前：「旅行の荷造り」など",
  itemPh: "項目 {{n}}",
  addItem: "+ 項目",
  removeItem: "項目を削除",
  hint: "すべての項目にチェックを入れると達成。Enter で項目を追加。",
  check: "チェックする",
  uncheck: "チェックを外す",
  count: "{{done}} / {{total}}",
};
