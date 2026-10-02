// Textos del personaje y su equipo. Se montan bajo la clave `equipment` en src/i18n/locales/{es,ja}.ts.

export const equipmentEs = {
  open: "Personaje",
  openTitle: "Personaje: equipo y atributos (P)",
  close: "Cerrar",
  armor: "Equipo",
  decor: "Decoración del menú",
  prestige: "Prestigio",
  prestigeTitle: "Estrellas de rareza de todo lo que llevas puesto",
  empty: "Vacío",
  wardrobe: {
    title: "Armario",
    none: "Aún no tienes nada para esta ranura.",
    hint: "Hu Tao vende equipo y decoración en su escaparate.",
    goShop: "Ir al mercader",
    equip: "Ponérmelo",
    equipDecor: "Decorar el menú",
    unequip: "Quitar",
    worn: "Puesto",
    back: "Ver atributos",
  },
  toast: {
    equipped: "Te has puesto «{{name}}»",
    decorated: "«{{name}}» decora ahora el menú",
  },
  keys: {
    slots: "Ranura",
    back: "atributos",
    close: "cerrar",
  },
};

export const equipmentJa: typeof equipmentEs = {
  open: "キャラクター",
  openTitle: "キャラクター：装備と能力値（P）",
  close: "閉じる",
  armor: "装備",
  decor: "メニューの飾り",
  prestige: "風格",
  prestigeTitle: "装備しているものすべてのレア度の星",
  empty: "なし",
  wardrobe: {
    title: "衣装棚",
    none: "この部位の品はまだ持っていません。",
    hint: "胡桃の店先で装備や飾りが買えます。",
    goShop: "商人のところへ",
    equip: "装備する",
    equipDecor: "メニューに飾る",
    unequip: "外す",
    worn: "装備中",
    back: "能力値を見る",
  },
  toast: {
    equipped: "「{{name}}」を装備しました",
    decorated: "「{{name}}」でメニューを飾りました",
  },
  keys: {
    slots: "部位",
    back: "能力値",
    close: "閉じる",
  },
};
