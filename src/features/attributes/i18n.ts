// Textos de los atributos. Se montan bajo la clave `attributes` en src/i18n/locales/{es,ja}.ts.
// Los nombres de los atributos son las áreas que escribe el usuario: no se traducen.

export const attributesEs = {
  title: "Atributos",
  subtitle: "Una por cada área de tus quests",
  empty: "Aún no hay atributos. Completa quests con un área (Salud, Estudio…) para desarrollarlos.",
  noArea: "Las quests sin área dan XP, pero no suben ningún atributo.",
  few: "Con tres áreas o más verás tu radar.",
  radar: "Las {{n}} áreas con más experiencia",
  level: "Nv. {{n}}",
  quests_one: "{{count}} quest",
  quests_other: "{{count}} quests",
  xp: "{{xp}} XP",
  next: "{{xp}} XP para el nivel {{n}}",
};

export const attributesJa: typeof attributesEs = {
  title: "能力値",
  subtitle: "クエストの分野ごとに一つ",
  empty: "まだ能力値がありません。分野（健康・勉強など）のあるクエストを達成すると育ちます。",
  noArea: "分野のないクエストは経験値になりますが、能力値は上がりません。",
  few: "分野が三つ以上になるとレーダーが表示されます。",
  radar: "経験値の多い {{n}} 分野",
  level: "Lv. {{n}}",
  quests_one: "クエスト {{count}} 件",
  quests_other: "クエスト {{count}} 件",
  xp: "{{xp}} XP",
  next: "レベル {{n}} まで {{xp}} XP",
};
