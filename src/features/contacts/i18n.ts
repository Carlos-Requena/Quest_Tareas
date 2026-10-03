// Textos de los contactos. Se montan bajo la clave `contacts` en src/i18n/locales/{es,ja}.ts.

export const contactsEs = {
  label: "Contactos",
  add: "+ Añadir contacto…",
  hint: "Para agendar una llamada, un correo o una visita: la quest llevará un botón para llamar, escribir o abrir.",
  kinds: {
    phone: "Teléfono",
    email: "Correo",
    whatsapp: "WhatsApp",
    link: "Enlace",
    address: "Dirección",
  },
  namePh: "A quién: «Dr. García»",
  valuePh: {
    phone: "+34 600 123 456",
    email: "nombre@correo.es",
    whatsapp: "+34 600 123 456 (con prefijo)",
    link: "www.ejemplo.es",
    address: "Calle Mayor 1, Madrid",
  },
  invalid: {
    phone: "No parece un teléfono: no se podrá llamar",
    email: "No parece un correo: no se podrá escribir",
    whatsapp: "No parece un teléfono: ponlo con el prefijo del país (+34…)",
    link: "No parece un enlace web",
    address: "",
  },
  remove: "Quitar contacto",
  action: {
    phone: "Llamar",
    email: "Escribir",
    whatsapp: "WhatsApp",
    link: "Abrir",
    address: "Cómo llegar",
  },
  copy: "Copiar",
  toast: {
    copied: "«{{value}}» copiado",
    openError: "No se pudo abrir «{{value}}»",
    copyError: "No se pudo copiar",
  },
  has_one: "{{count}} contacto",
  has_other: "{{count}} contactos",
};

export const contactsJa: typeof contactsEs = {
  label: "連絡先",
  add: "+ 連絡先を追加…",
  hint: "電話・メール・訪問の予定に。クエストに「電話する」「メールする」「開く」ボタンが付きます。",
  kinds: {
    phone: "電話",
    email: "メール",
    whatsapp: "WhatsApp",
    link: "リンク",
    address: "住所",
  },
  namePh: "相手：「ガルシア先生」",
  valuePh: {
    phone: "+81 90 1234 5678",
    email: "name@example.jp",
    whatsapp: "+81 90 1234 5678（国番号から）",
    link: "www.example.jp",
    address: "東京都千代田区1-1",
  },
  invalid: {
    phone: "電話番号ではないようです（発信できません）",
    email: "メールアドレスではないようです（送信できません）",
    whatsapp: "電話番号ではないようです。国番号から入力してください（+81…）",
    link: "Web のリンクではないようです",
    address: "",
  },
  remove: "連絡先を削除",
  action: {
    phone: "電話する",
    email: "メールする",
    whatsapp: "WhatsApp",
    link: "開く",
    address: "道順",
  },
  copy: "コピー",
  toast: {
    copied: "「{{value}}」をコピーしました",
    openError: "「{{value}}」を開けませんでした",
    copyError: "コピーできませんでした",
  },
  has_one: "連絡先 {{count}} 件",
  has_other: "連絡先 {{count}} 件",
};
