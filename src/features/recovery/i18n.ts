// Textos de la pantalla de recuperación. Se montan bajo la clave `recovery` en src/i18n/locales/{es,ja}.ts.

export const recoveryEs = {
  title: "La aventura se ha detenido",
  body: "Algo ha fallado al dibujar la ventana. Tu progreso está a salvo: cada acción ya quedó guardada en el diario de eventos.",
  retry: "Volver a intentarlo",
  reload: "Reiniciar Quests",
  details: "Detalles del fallo",
  copy: "Copiar detalles",
  copied: "Copiado",
};

export const recoveryJa: typeof recoveryEs = {
  title: "冒険が中断されました",
  body: "画面の描画中に問題が発生しました。進行状況は無事です。すべての行動はすでにイベントの記録に保存されています。",
  retry: "もう一度試す",
  reload: "Quests を再起動",
  details: "エラーの詳細",
  copy: "詳細をコピー",
  copied: "コピーしました",
};
