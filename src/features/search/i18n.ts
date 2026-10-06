// Textos de la búsqueda. Se montan bajo la clave `search` en src/i18n/locales/{es,ja}.ts.

export const searchEs = {
  title: "Buscar",
  placeholder: "Buscar quests, encargos, agenda y objetos…",
  hint: "Busca en títulos, descripciones, objetivos, lugares, notas y contactos. Sin distinguir tildes.",
  none: "Nada coincide.",
  close: "Cerrar",
  keys: "↑↓ elegir · Enter ir · Esc cerrar",
  itemHint: "«{{name}}» está en el almanaque",
  kinds: {
    quest: "Quest",
    temporal: "Encargo",
    agenda: "Agenda",
    item: "Objeto",
  },
  status: {
    open: "",
    active: "En curso",
    done: "Terminada · clavar otra",
    failed: "Fallida · volver a clavar",
    reserved: "Sin aceptar",
  },
};

export const searchJa: typeof searchEs = {
  title: "検索",
  placeholder: "クエスト・依頼・予定・アイテムを検索…",
  hint: "タイトル・説明・目標・場所・メモ・連絡先から探します。",
  none: "見つかりませんでした。",
  close: "閉じる",
  keys: "↑↓ 選ぶ · Enter 開く · Esc 閉じる",
  itemHint: "「{{name}}」は図鑑にあります",
  kinds: {
    quest: "クエスト",
    temporal: "依頼",
    agenda: "予定",
    item: "アイテム",
  },
  status: {
    open: "",
    active: "受注中",
    done: "達成済み · もう一度貼る",
    failed: "失敗 · もう一度貼る",
    reserved: "未受注",
  },
};
