// Textos de las notificaciones. Se montan bajo la clave `notifications` en src/i18n/locales/{es,ja}.ts.

export const notificationsEs = {
  on: "Activar los avisos del sistema",
  off: "Quitar los avisos del sistema",
  menu: "Avisos",
  menuOn: "Activados",
  menuOff: "Desactivados",
  toast: {
    on: "Avisos activados: pomodoros, encargos, agenda, fechas límite y rachas",
    off: "Avisos desactivados en este equipo",
    denied: "El sistema no da permiso para avisar: actívalo en sus ajustes",
  },
  pomodoro: {
    focusDone: "Ronda {{round}} de {{rounds}} terminada: toca descansar",
    breakDone: "Fin del descanso: empieza la ronda {{round}} de {{rounds}}",
    allDone: "Pomodoro terminado: ya puedes reportarla",
  },
  temporal: {
    soon: "Encargo a las {{time}}",
    today: "Encargo para hoy",
    burn: "Sigue sin cumplir: el cartel se quemará a medianoche",
  },
  quest: {
    due: "Vence hoy",
    fracture: "Sigue sin completar: se fracturará a medianoche",
  },
  agenda: "Empieza a las {{time}}",
  streak: "Tu racha de {{n}} se rompe en 3 horas",
};

export const notificationsJa: typeof notificationsEs = {
  on: "システム通知をオンにする",
  off: "システム通知をオフにする",
  menu: "通知",
  menuOn: "オン",
  menuOff: "オフ",
  toast: {
    on: "通知オン：ポモドーロ・依頼・予定・期限・連続記録",
    off: "この端末の通知をオフにしました",
    denied: "通知が許可されていません。システムの設定で許可してください",
  },
  pomodoro: {
    focusDone: "{{rounds}}回中{{round}}回目が終了：休憩しよう",
    breakDone: "休憩終了：{{rounds}}回中{{round}}回目を始めよう",
    allDone: "ポモドーロ完了：報告できます",
  },
  temporal: {
    soon: "{{time}}に依頼があります",
    today: "今日の依頼",
    burn: "まだ果たしていません。今夜0時に貼り紙が燃え尽きます",
  },
  quest: {
    due: "今日が期限",
    fracture: "まだ未達成です。今夜0時に砕け散ります",
  },
  agenda: "{{time}}に始まります",
  streak: "{{n}}回の連続記録があと3時間で途切れます",
};
