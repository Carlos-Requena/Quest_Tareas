// Textos de los fallos. Se montan bajo la clave `failure` en src/i18n/locales/{es,ja}.ts.
// «Quest Failed» y «Burned» son etiquetas decorativas: se quedan en inglés, como «Quest Clear».

export const failureEs = {
  quest: {
    subtitle: "Pasó el día de su fecha límite: «{{title}}» se ha fracturado.",
  },
  temporal: {
    subtitle: "Pasó su día sin cumplirlo: el cartel de «{{title}}» se ha quemado.",
    lost_one: "Su quest sin terminar se ha perdido con él.",
    lost_other: "Sus {{count}} quests sin terminar se han perdido con él.",
  },
  repost: "Volver a clavar",
  continue: "Continuar",
  next_one: "Siguiente (queda {{count}})",
  next_other: "Siguiente (quedan {{count}})",
  hint: "Pulsa <kbd>Enter</kbd> para continuar",
  chronicle: {
    quest: "Se fracturó",
    temporal: "Se quemó",
    lost_one: "con {{count}} quest",
    lost_other: "con {{count}} quests",
  },
  view: {
    burnedOn: "Se quemó el {{date}}",
    failedOn: "Se fracturó el {{date}}",
  },
  when: {
    burned: "Quemado",
  },
  stale: "Vencida (de antes de los fallos)",
};

export const failureJa: typeof failureEs = {
  quest: {
    subtitle: "期限の日が過ぎ、「{{title}}」は砕け散った。",
  },
  temporal: {
    subtitle: "期日までに果たせず、「{{title}}」の貼り紙は燃え尽きた。",
    lost_one: "未達成のクエストも一緒に失われた。",
    lost_other: "未達成のクエスト{{count}}件も一緒に失われた。",
  },
  repost: "もう一度貼り出す",
  continue: "続ける",
  next_one: "次へ（残り{{count}}件）",
  next_other: "次へ（残り{{count}}件）",
  hint: "<kbd>Enter</kbd>で続ける",
  chronicle: {
    quest: "砕け散った",
    temporal: "燃え尽きた",
    lost_one: "クエスト{{count}}件とともに",
    lost_other: "クエスト{{count}}件とともに",
  },
  view: {
    burnedOn: "{{date}}に燃え尽きた",
    failedOn: "{{date}}に砕け散った",
  },
  when: {
    burned: "焼失",
  },
  stale: "期限切れ（失敗の導入前）",
};
