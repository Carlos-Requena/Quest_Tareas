// Textos del alta rápida. Se montan bajo la clave `quickadd` en src/i18n/locales/{es,ja}.ts.

export const quickaddEs = {
  label: "Alta rápida de una quest",
  placeholder: "Apunta una quest…  «Llamar al banco mañana #Hogar !»",
  details: "Más detalles (Mayús+Enter)",
  noTitle: "Falta el título",
  keys: "Enter publica · Mayús+Enter, más detalles",
  area: "Área: {{value}}",
  client: "De: {{value}}",
  condition: "Hacerlo",
  empty: "Escribe un título para la quest",
  help: "Fechas: hoy, mañana, pasado mañana, un día de la semana o 12/10. Marcas: #área, @quién, ! para élite y x3 para hacerlo 3 veces.",
  key: "Apuntar",
  full: "Formulario completo",
};

export const quickaddJa: typeof quickaddEs = {
  label: "クエストをすばやく追加",
  placeholder: "クエストを書き留める…「銀行に電話 明日 #家事 !」",
  details: "詳しく設定（Shift+Enter）",
  noTitle: "タイトルがありません",
  keys: "Enterで掲示 · Shift+Enterで詳細",
  area: "分野：{{value}}",
  client: "依頼人：{{value}}",
  condition: "やり遂げる",
  empty: "クエストのタイトルを書いてください",
  help: "日付：今日・明日・明後日・曜日（月曜など）・12/10。記号：#分野、@依頼人、! でエリート、x3 で3回。",
  key: "書き留める",
  full: "詳細フォーム",
};
