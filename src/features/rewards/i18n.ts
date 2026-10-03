// Textos de la recompensa calculada. Se montan bajo la clave `rewards` en src/i18n/locales/{es,ja}.ts.

export const rewardsEs = {
  label: "Recompensa",
  quest: "Sale de los objetivos: minutos de pomodoro, cantidad de los contadores y casillas de las listas, por el peso de la categoría (élite ×2, repetible ×0,5).",
  temporal: "Base por calaveras más un {{pct}} % de lo que valen sus quests. Cada quest paga lo suyo al completarla.",
};

export const rewardsJa: typeof rewardsEs = {
  label: "報酬",
  quest: "目標から算出：ポモドーロの分数、カウンターの回数、リストの項目数に、種別の倍率（エリート ×2、リピート ×0.5）を掛けた値。",
  temporal: "ドクロの数による基本報酬に、紐づくクエストの価値の {{pct}}% を加算。各クエストの報酬は達成時に別途受け取れます。",
};
