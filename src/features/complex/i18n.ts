// Textos de las quests complejas. Se montan bajo la clave `complex` en src/i18n/locales/{es,ja}.ts.

export const complexEs = {
  recurrence: {
    label: "Repetición",
    labelRepeat: "Reaparece tras completarla",
    none: "No se repite",
    custom: "Personalizada…",
    every: "Cada",
    units: {
      hours: "horas",
      days: "días",
      weeks: "semanas",
    },
    hint: "Al completarla vuelve al tablón pasado ese tiempo, aunque no sea de la categoría Repetible.",
  },
  requires: {
    label: "Requisitos",
    pick: "+ Añadir requisito…",
    none: "No quedan quests que puedan ser requisito.",
    hint: "No se podrá aceptar hasta completar estas quests.",
    remove: "Quitar requisito",
  },
  detail: {
    requires: "Requisitos",
    unlocks: "Al completarla desbloquea",
    met: "Completada",
    pending: "Pendiente",
    open: "Ver quest",
  },
  card: {
    locked_one: "Requiere «{{title}}»",
    locked_other: "Requiere {{count}} quests",
  },
  actions: {
    locked: "Bloqueada",
  },
  toast: {
    locked: "Bloqueada: antes completa «{{title}}»",
    unlocked: "«{{title}}» completada · desbloquea «{{next}}»",
  },
};

export const complexJa: typeof complexEs = {
  recurrence: {
    label: "繰り返し",
    labelRepeat: "達成後の再受注まで",
    none: "繰り返さない",
    custom: "カスタム…",
    every: "間隔",
    units: {
      hours: "時間",
      days: "日",
      weeks: "週間",
    },
    hint: "達成すると、この時間のあとで掲示板に戻ります（繰り返しカテゴリ以外でも）。",
  },
  requires: {
    label: "前提クエスト",
    pick: "+ 前提クエストを追加…",
    none: "前提にできるクエストがありません。",
    hint: "前提クエストを達成するまで受注できません。",
    remove: "前提を外す",
  },
  detail: {
    requires: "前提クエスト",
    unlocks: "達成すると解放",
    met: "達成済み",
    pending: "未達成",
    open: "クエストを見る",
  },
  card: {
    locked_one: "前提：「{{title}}」",
    locked_other: "前提クエスト {{count}} 件",
  },
  actions: {
    locked: "前提未達成",
  },
  toast: {
    locked: "受注不可：先に「{{title}}」を達成してください",
    unlocked: "「{{title}}」を達成 · 「{{next}}」が解放されました",
  },
};
