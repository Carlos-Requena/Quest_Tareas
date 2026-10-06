// Textos de la edición de quests. Se montan bajo la clave `editing` en src/i18n/locales/{es,ja}.ts.

export const editingEs = {
  subtitle: "Editar quest",
  submit: "Guardar cambios",
  save: "guardar",
  open: "Editar",
  toast: {
    saved: "«{{title}}» actualizada",
    unchanged: "No has cambiado nada",
    finished: "«{{title}}» ya está terminada: no se puede editar",
  },
};

export const editingJa: typeof editingEs = {
  subtitle: "クエストを編集",
  submit: "変更を保存",
  save: "保存",
  open: "編集",
  toast: {
    saved: "「{{title}}」を更新しました",
    unchanged: "変更はありません",
    finished: "「{{title}}」は完了済みのため編集できません",
  },
};
