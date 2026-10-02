// Textos de los plazos. Se montan bajo la clave `horizon` en src/i18n/locales/{es,ja}.ts.

export const horizonEs = {
  label: "Plazo",
  filter: {
    all: "Todo",
    day: "1 día",
    week: "7 días",
    fortnight: "2 semanas",
    month: "1 mes",
    later: "+1 mes",
    none: "Sin fecha",
  },
  hint: {
    all: "Sin filtrar por plazo",
    day: "Hoy, mañana o vencido",
    week: "Próximos 7 días (de 2 a 7)",
    fortnight: "Dos semanas (de 8 a 14 días)",
    month: "Un mes (de 15 a 30 días)",
    later: "Más de un mes",
    none: "Quests sin fecha límite",
  },
  switch: "Plazo (H)",
  empty: "No hay nada en este plazo.",
  due: {
    overdue: "Vencida",
    today: "Hoy",
    todayAt: "Hoy, {{time}}",
    tomorrow: "Mañana",
    inDays: "En {{n}} días",
  },
  form: {
    label: "Fecha límite",
    none: "Sin fecha",
    other: "Otra fecha",
    hint: "Así sale en el filtro de plazo del tablón.",
    recurring: "Las quests que se repiten no tienen fecha límite.",
  },
  detail: {
    deadline: "Plazo: {{date}}",
  },
};

export const horizonJa: typeof horizonEs = {
  label: "期限",
  filter: {
    all: "すべて",
    day: "残り1日",
    week: "7日以内",
    fortnight: "2週間",
    month: "1か月",
    later: "1か月以上",
    none: "期限なし",
  },
  hint: {
    all: "期限で絞り込まない",
    day: "本日・明日・期限切れ",
    week: "7日以内（2〜7日）",
    fortnight: "2週間（8〜14日）",
    month: "1か月（15〜30日）",
    later: "1か月より先",
    none: "期限のないクエスト",
  },
  switch: "期限 (H)",
  empty: "この期限の依頼はありません。",
  due: {
    overdue: "期限切れ",
    today: "本日",
    todayAt: "本日 {{time}}",
    tomorrow: "明日",
    inDays: "あと {{n}} 日",
  },
  form: {
    label: "期限",
    none: "期限なし",
    other: "日付を指定",
    hint: "掲示板の期限フィルターに表示されます。",
    recurring: "繰り返すクエストには期限を設定できません。",
  },
  detail: {
    deadline: "期限：{{date}}",
  },
};
