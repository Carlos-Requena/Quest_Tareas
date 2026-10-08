// Textos del compañero de «Mi día». Se montan bajo la clave `companion` en
// src/i18n/locales/{es,ja}.ts. Los rótulos de cada situación (tags) van en inglés a propósito,
// como los bloques de «Mi día». Las frases de serie admiten {{title}}, {{n}} y {{time}}.

export const companionEs = {
  label: "Compañero",
  next: "Toca para otra frase",
  situations: {
    tonight: "Esta noche",
    streak: "Racha",
    active: "En curso",
    due: "Toca hoy",
    failed: "Se perdió",
    clear: "Cumplido",
    quiet: "Día libre",
  },
  tags: {
    tonight: "Last Day",
    streak: "Streak",
    active: "In Progress",
    due: "Today",
    failed: "Lost",
    clear: "Clear",
    quiet: "Free Day",
  },
  say: {
    tonight: {
      a: "«{{title}}» se pierde esta noche. Quedan {{time}}: vamos a por ello.",
      b: "Ojo, que hoy vence «{{title}}». Si lo dejamos, mañana estará roto.",
      c: "Lo de hoy no espera: quedan {{time}} para «{{title}}».",
    },
    streak: {
      a: "Tu racha de {{n}} con «{{title}}» se rompe en {{time}}. ¡No la sueltes!",
      b: "«{{title}}» lleva {{n}} seguidas. Sería una pena perderla ahora.",
      c: "Una racha así no se tira por la borda. «{{title}}», antes de {{time}}.",
    },
    active: {
      a: "Seguimos con «{{title}}». Paso a paso.",
      b: "Tienes «{{title}}» en marcha. Yo vigilo el resto.",
      c: "¿Cómo va «{{title}}»? Te espero en el tablón cuando acabes.",
    },
    due: {
      a: "Hoy toca «{{title}}». Cuando quieras, lo aceptamos.",
      b: "«{{title}}» ha vuelto al tablón. ¿Le damos?",
      c: "Hay trabajo esperando: «{{title}}», para empezar.",
    },
    failed: {
      a: "Hoy se nos escapó algo. Mañana lo volvemos a clavar.",
      b: "No pasa nada por perder una. Lo que cuenta es volver.",
      c: "Ha sido un día duro. Descansa, que mañana hay revancha.",
    },
    clear: {
      a: "¡Día cumplido! Te has ganado un descanso.",
      b: "Todo hecho por hoy. Así se hace, aventurero.",
      c: "Nada pendiente y el día a tu favor. ¡Buen trabajo!",
    },
    quiet: {
      a: "Día libre. ¿Planificamos la semana en el calendario?",
      b: "Nada urgente hoy. Buen momento para un encargo nuevo.",
      c: "Hoy el tablón está tranquilo. ¿Una quest pequeña para calentar?",
    },
  },
};

export const companionJa: typeof companionEs = {
  label: "相棒",
  next: "タップで次の台詞",
  situations: {
    tonight: "今夜まで",
    streak: "連続記録",
    active: "受注中",
    due: "今日の分",
    failed: "失敗",
    clear: "達成",
    quiet: "自由な日",
  },
  tags: {
    tonight: "Last Day",
    streak: "Streak",
    active: "In Progress",
    due: "Today",
    failed: "Lost",
    clear: "Clear",
    quiet: "Free Day",
  },
  say: {
    tonight: {
      a: "「{{title}}」は今夜で失われる。残り{{time}}、行こう。",
      b: "気をつけて、「{{title}}」は今日が期限。放っておけば明日には壊れてしまう。",
      c: "今日の分は待ってくれない。「{{title}}」まで残り{{time}}。",
    },
    streak: {
      a: "「{{title}}」の{{n}}回連続、あと{{time}}で途切れる。手放さないで！",
      b: "「{{title}}」はもう{{n}}回続いている。ここで失うのは惜しい。",
      c: "こんな連続記録は捨てられない。「{{title}}」を{{time}}以内に。",
    },
    active: {
      a: "「{{title}}」を続けよう。一歩ずつね。",
      b: "「{{title}}」が進行中。ほかは私が見張っておく。",
      c: "「{{title}}」の調子はどう？終わったら掲示板で待ってる。",
    },
    due: {
      a: "今日は「{{title}}」の日。いつでも受注できるよ。",
      b: "「{{title}}」が掲示板に戻ってきた。やる？",
      c: "仕事が待ってる。まずは「{{title}}」から。",
    },
    failed: {
      a: "今日は取りこぼしがあった。明日また貼り直そう。",
      b: "一つ失っても大丈夫。大事なのは戻ってくること。",
      c: "大変な一日だったね。休んで、明日は雪辱戦だ。",
    },
    clear: {
      a: "今日は達成！ゆっくり休んでいいよ。",
      b: "今日の分はすべて完了。さすがだね、冒険者。",
      c: "やり残しはなし。今日はあなたの勝ち。お疲れさま！",
    },
    quiet: {
      a: "自由な日。カレンダーで今週の計画を立てようか？",
      b: "今日は急ぎなし。新しい依頼を貼るにはいい頃合い。",
      c: "掲示板は静か。軽いクエストで体を温めない？",
    },
  },
};
