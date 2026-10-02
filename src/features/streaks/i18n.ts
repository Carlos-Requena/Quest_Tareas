// Textos de las rachas. Se montan bajo la clave `streaks` en src/i18n/locales/{es,ja}.ts.

export const streaksEs = {
  badge: "Racha de {{n}}",
  label: "Racha",
  current_one: "{{count}} vez seguida",
  current_other: "{{count}} veces seguidas",
  best: "Mejor: {{n}}",
  broken: "Rota. La mejor fue de {{n}}.",
  none: "Complétala a tiempo varias veces seguidas para empezar una racha.",
  until: "Sigue viva si la completas antes de {{when}}",
  risk: "¡Se rompe en {{left}}!",
  milestone: "¡Racha de {{n}} en «{{title}}»!",
};

export const streaksJa: typeof streaksEs = {
  badge: "{{n}} 連続",
  label: "連続達成",
  current_one: "{{count}} 回連続",
  current_other: "{{count}} 回連続",
  best: "最高：{{n}}",
  broken: "途切れました。最高は {{n}} 回。",
  none: "期限内に続けて達成すると連続記録が始まります。",
  until: "{{when}} までに達成すれば続きます",
  risk: "あと {{left}} で途切れます！",
  milestone: "「{{title}}」 {{n}} 回連続達成！",
};
