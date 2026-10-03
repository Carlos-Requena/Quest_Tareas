// Textos del coleccionable de la semana. Se montan bajo la clave `collectibles` en src/i18n/locales/{es,ja}.ts.
// Lo que dice Hu Tao en esta pestaña está en features/merchant/i18n.ts (`lines.rare`, `soldOut`, `noRare`).

export const collectiblesEs = {
  title: "Coleccionable de la semana",
  sold: "Vendido",
  soldNote: "Ya te llevaste el de esta semana. El lunes Hu Tao trae otro.",
  complete: "Tienes todos los coleccionables míticos y legendarios. No queda nada que venderte.",
  empty: "Aún no hay coleccionables míticos ni legendarios en el almanaque.",
  rules:
    "Cada lunes, un coleccionable mítico o legendario que no tienes, por un 50 % más que una pieza de equipo de su rareza. Uno por semana. Si te sale en un cofre antes de comprarlo, Hu Tao trae otro.",
  toast: {
    bought: "«{{name}}» ya es parte de tu colección (−{{price}} G)",
  },
};

export const collectiblesJa: typeof collectiblesEs = {
  title: "今週のコレクション",
  sold: "売約済",
  soldNote: "今週の品はもう買ったよ。月曜日に胡桃が次を持ってくる。",
  complete: "神話級と伝説級のコレクションをすべて集めました。もう売るものはありません。",
  empty: "図鑑にはまだ神話級・伝説級のコレクションアイテムがありません。",
  rules:
    "毎週月曜日、未入手の神話級・伝説級コレクションアイテムを1つ、同じレアリティの装備の1.5倍の値段で販売。購入は週に1つまで。買う前に宝箱から出たら、胡桃が別の品を持ってきます。",
  toast: {
    bought: "「{{name}}」をコレクションに加えた（−{{price}} G）",
  },
};
