// Textos de la música. Se montan bajo la clave `music` en src/i18n/locales/{es,ja}.ts.

export const musicEs = {
  play: "Reproducir música (M)",
  pause: "Pausar música (M)",
  waiting: "La música empezará con tu primera interacción (M)",
  muted: "Todo el sonido está silenciado (♪). Pulsa para reactivarlo (M)",
  volume: "Volumen de la música",
  nowPlaying: "Sonando: {{track}}",
  error: "No se pudo cargar la música",
  tracks: {
    tavern: "Taberna",
  },
};

export const musicJa: typeof musicEs = {
  play: "BGMを再生 (M)",
  pause: "BGMを停止 (M)",
  waiting: "最初の操作でBGMが始まります (M)",
  muted: "サウンドはミュート中です（♪）。押すと再開します (M)",
  volume: "BGMの音量",
  nowPlaying: "再生中: {{track}}",
  error: "BGMを読み込めませんでした",
  tracks: {
    tavern: "酒場",
  },
};
