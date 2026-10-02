// Piezas de serie del mercader: las que trae la app para todo el que la instala.
// Inspiradas en Mushoku Tensei, Re:Zero, Konosuba y los JRPG clásicos; el arte se
// dibuja con código (art.ts) y los textos están en i18n.ts.
//
// NORMA: no borres ni cambies la `key` de una pieza que ya existe: las compras guardadas
// la nombran (`armory-<key>`). Añadir piezas no cambia la proyección.

import type { Rarity } from "../items/model";
import type { GearSlot } from "../merchant/model";
import type { BackdropSpec, IconKind, Palette } from "./art";

/** De dónde viene la idea de cada pieza. */
export const SOURCES = ["mushoku", "rezero", "konosuba", "jrpg", "guild"] as const;
export type ArmorySource = (typeof SOURCES)[number];

export interface ArmoryEntry {
  key: string;
  slot: GearSlot;
  rarity: Rarity;
  source: ArmorySource;
  /** Icono: forma y paleta. Los fondos además tienen su escena. */
  icon: { kind: IconKind; p: Palette } | { scene: BackdropSpec };
}

// Paletas
const pal = (main: string, dark: string, light: string, accent: string): Palette => ({ main, dark, light, accent });
const LEATHER = pal("#8a5a34", "#4a2c18", "#c08a5a", "#d6b25e");
const IRON = pal("#8f949c", "#3d4148", "#e2e6ea", "#b8892f");
const MITHRIL = pal("#9fc4d6", "#3d6478", "#eef8ff", "#7fe0ff");
const GOLD = pal("#d6a63a", "#6e4d12", "#fff0b8", "#ff5a4e");
const CRIMSON = pal("#b0242e", "#4a0c12", "#ff8a7a", "#ffcf5a");
const AQUA = pal("#4aa8e0", "#16466e", "#c8eeff", "#e8f6ff");
const VIOLET = pal("#8a5ad0", "#2e1a52", "#d9c2ff", "#ffd36a");
const JADE = pal("#3f9a6e", "#174a32", "#a8f0c8", "#e8d27a");
const EMBER = pal("#e0662a", "#6e2208", "#ffc27a", "#fff1a8");
const ONYX = pal("#3c3a3a", "#121010", "#8a8686", "#c33b3b");
const SILVER = pal("#c8ccd4", "#5a606a", "#ffffff", "#5ab0ff");
const SLIME = pal("#4a9ee8", "#1c4a8a", "#bfe6ff", "#ff6e7a");
const TRACK = pal("#5a5f6a", "#24272e", "#9aa0ac", "#f2f2f2");
const DRAGON = pal("#4a3a8a", "#1c1440", "#9a8ae0", "#d6b25e");
const PINE = pal("#9a6a3a", "#5a3a1a", "#d0a070", "#6a8a4a");
const BRONZE = pal("#b07a3a", "#5a3a14", "#f0c890", "#4a9ac8");
const CYAN = pal("#5ae0e0", "#1a6a7a", "#e8ffff", "#ffffff");

const icon = (kind: IconKind, p: Palette) => ({ kind, p });
const scene = (s: BackdropSpec) => ({ scene: s });

export const ARMORY: ArmoryEntry[] = [
  // ───────── Cabeza ─────────
  { key: "novice_hood", slot: "head", rarity: "common", source: "guild", icon: icon("hood", LEATHER) },
  { key: "slime_hat", slot: "head", rarity: "uncommon", source: "jrpg", icon: icon("slime", SLIME) },
  { key: "maid_headdress", slot: "head", rarity: "uncommon", source: "rezero", icon: icon("headband", pal("#f6f2ea", "#8a8478", "#ffffff", "#1e1e2a")) },
  { key: "roxy_hat", slot: "head", rarity: "rare", source: "mushoku", icon: icon("witchhat", pal("#3f5fa8", "#18244a", "#8fb0ff", "#e8d27a")) },
  { key: "crimson_hat", slot: "head", rarity: "epic", source: "konosuba", icon: icon("witchhat", pal("#2a2430", "#0c0a10", "#6a5a78", "#d0303a")) },
  { key: "dragoon_helm", slot: "head", rarity: "mythic", source: "jrpg", icon: icon("dragonhelm", DRAGON) },
  { key: "ribbon", slot: "head", rarity: "legendary", source: "jrpg", icon: icon("ribbon", pal("#ff6e9a", "#8a1e48", "#ffd0e0", "#ffd36a")) },

  // ───────── Cuerpo ─────────
  { key: "padded_jerkin", slot: "body", rarity: "common", source: "guild", icon: icon("tunic", LEATHER) },
  { key: "summoned_tracksuit", slot: "body", rarity: "uncommon", source: "rezero", icon: icon("tracksuit", TRACK) },
  { key: "maid_uniform", slot: "body", rarity: "rare", source: "rezero", icon: icon("maid", pal("#1e2238", "#0a0c16", "#4a5078", "#3a70d0")) },
  { key: "migurd_robe", slot: "body", rarity: "rare", source: "mushoku", icon: icon("robe", pal("#3e6aa8", "#16284a", "#9cc0f0", "#e8d27a")) },
  { key: "crusader_armor", slot: "body", rarity: "epic", source: "konosuba", icon: icon("plate", pal("#c8ccd4", "#4a5060", "#ffffff", "#3a6ac8")) },
  { key: "genji_armor", slot: "body", rarity: "mythic", source: "jrpg", icon: icon("lamellar", pal("#8a1e2a", "#3a080e", "#e0606a", "#e8c46a")) },
  { key: "dragon_god_vestments", slot: "body", rarity: "legendary", source: "mushoku", icon: icon("robe", pal("#e8e2d0", "#5a5040", "#ffffff", "#c8a040")) },

  // ───────── Manos ─────────
  { key: "herbalist_gloves", slot: "hands", rarity: "common", source: "guild", icon: icon("glove", pal("#9a8a5a", "#4a3e20", "#d8c890", "#6a8a4a")) },
  { key: "thief_gloves", slot: "hands", rarity: "uncommon", source: "konosuba", icon: icon("glove", pal("#3a3f4a", "#14161c", "#7a8090", "#5ac0a0")) },
  { key: "mithril_gauntlets", slot: "hands", rarity: "rare", source: "jrpg", icon: icon("gauntlet", MITHRIL) },
  { key: "sword_god_bracers", slot: "hands", rarity: "rare", source: "mushoku", icon: icon("bracer", IRON) },
  { key: "north_god_gauntlets", slot: "hands", rarity: "epic", source: "mushoku", icon: icon("gauntlet", ONYX) },
  { key: "garfiel_shields", slot: "hands", rarity: "mythic", source: "rezero", icon: icon("bracer", GOLD) },
  { key: "kaiser_knuckles", slot: "hands", rarity: "legendary", source: "jrpg", icon: icon("knuckle", pal("#e8c040", "#7a5208", "#fff4b0", "#ff4a3a")) },

  // ───────── Pies ─────────
  { key: "road_boots", slot: "feet", rarity: "common", source: "guild", icon: icon("boot", LEATHER) },
  { key: "goddess_sandals", slot: "feet", rarity: "uncommon", source: "konosuba", icon: icon("sandal", AQUA) },
  { key: "hermes_shoes", slot: "feet", rarity: "rare", source: "jrpg", icon: icon("wingboot", pal("#e0d0a0", "#7a6430", "#fff8e0", "#ffffff")) },
  { key: "royal_guard_boots", slot: "feet", rarity: "rare", source: "rezero", icon: icon("greave", SILVER) },
  { key: "eris_boots", slot: "feet", rarity: "epic", source: "mushoku", icon: icon("boot", CRIMSON) },
  { key: "sword_saint_greaves", slot: "feet", rarity: "mythic", source: "rezero", icon: icon("greave", pal("#e8ecf4", "#6a7080", "#ffffff", "#d03040")) },
  { key: "seven_league_boots", slot: "feet", rarity: "legendary", source: "jrpg", icon: icon("wingboot", VIOLET) },

  // ───────── Armas ─────────
  { key: "wooden_sword", slot: "weapon", rarity: "common", source: "guild", icon: icon("sword", PINE) },
  { key: "ranoa_wand", slot: "weapon", rarity: "uncommon", source: "mushoku", icon: icon("wand", pal("#7a5a3a", "#3a2814", "#c09a6a", "#8ad0ff")) },
  { key: "chunchunmaru", slot: "weapon", rarity: "rare", source: "konosuba", icon: icon("katana", pal("#c8d0d8", "#4a5058", "#ffffff", "#e8c46a")) },
  { key: "aqua_heartia", slot: "weapon", rarity: "epic", source: "mushoku", icon: icon("staff", pal("#3a5a8a", "#14243a", "#8ab0e0", "#4ad0ff")) },
  { key: "rem_morning_star", slot: "weapon", rarity: "epic", source: "rezero", icon: icon("flail", pal("#8a929c", "#2e333a", "#d8dde2", "#4a7ad0")) },
  { key: "masamune", slot: "weapon", rarity: "mythic", source: "jrpg", icon: icon("katana", pal("#e0e8f0", "#5a6878", "#ffffff", "#8a3ad0")) },
  { key: "reid", slot: "weapon", rarity: "legendary", source: "rezero", icon: icon("greatsword", pal("#f0f4ff", "#6a7aa0", "#ffffff", "#e8c040")) },

  // ───────── Escudos ─────────
  { key: "pine_buckler", slot: "shield", rarity: "common", source: "guild", icon: icon("roundshield", PINE) },
  { key: "pot_lid", slot: "shield", rarity: "uncommon", source: "jrpg", icon: icon("potlid", pal("#a8acb2", "#4a4e54", "#eef0f2", "#3a3a3a")) },
  { key: "axel_guard_shield", slot: "shield", rarity: "rare", source: "konosuba", icon: icon("kite", pal("#3a6aa8", "#16284a", "#8ab0e0", "#e8c46a")) },
  { key: "crystal_shield", slot: "shield", rarity: "rare", source: "jrpg", icon: icon("crystalshield", CYAN) },
  { key: "aegis", slot: "shield", rarity: "epic", source: "jrpg", icon: icon("aegis", BRONZE) },
  { key: "asura_tower_shield", slot: "shield", rarity: "mythic", source: "mushoku", icon: icon("towershield", pal("#e8e4d8", "#6a6250", "#ffffff", "#c8a040")) },
  { key: "loto_shield", slot: "shield", rarity: "legendary", source: "jrpg", icon: icon("kite", pal("#3a5ad0", "#101e5a", "#a0b8ff", "#ff4a3a")) },

  // ───────── Capas ─────────
  { key: "wool_cloak", slot: "cape", rarity: "common", source: "guild", icon: icon("cloak", pal("#7a6a52", "#3a3020", "#b8a688", "#c08a5a")) },
  { key: "axel_guild_cape", slot: "cape", rarity: "uncommon", source: "konosuba", icon: icon("cape", pal("#2e5a3a", "#102a18", "#6aa07a", "#e8c46a")) },
  { key: "fitz_cape", slot: "cape", rarity: "rare", source: "mushoku", icon: icon("cloak", pal("#e8e8ec", "#7a7a88", "#ffffff", "#2a2a3a")) },
  { key: "hero_red_cape", slot: "cape", rarity: "rare", source: "jrpg", icon: icon("cape", CRIMSON) },
  { key: "witch_cult_robe", slot: "cape", rarity: "epic", source: "rezero", icon: icon("cloak", pal("#2a2234", "#0a0810", "#5a4a6a", "#a07ad0")) },
  { key: "demon_lord_mantle", slot: "cape", rarity: "mythic", source: "jrpg", icon: icon("cape", pal("#2a1a2a", "#0a050a", "#6a3a5a", "#d0303a")) },
  { key: "aqua_hagoromo", slot: "cape", rarity: "legendary", source: "konosuba", icon: icon("hagoromo", pal("#bfe8ff", "#3a8ac0", "#ffffff", "#4ab0f0")) },

  // ───────── Amuletos ─────────
  { key: "river_beads", slot: "amulet", rarity: "common", source: "guild", icon: icon("pendant", pal("#7a8a8a", "#3a4444", "#c0d0d0", "#a0c0c0")) },
  { key: "lucky_charm", slot: "amulet", rarity: "uncommon", source: "konosuba", icon: icon("charm", pal("#d04a3a", "#6a1a12", "#ff9a8a", "#ffe08a")) },
  { key: "migurd_pendant", slot: "amulet", rarity: "rare", source: "mushoku", icon: icon("pendant", pal("#c8a040", "#5a4210", "#fff0b0", "#3a70d0")) },
  { key: "knight_insignia", slot: "amulet", rarity: "rare", source: "rezero", icon: icon("badge", pal("#c8ccd4", "#4a5060", "#ffffff", "#9a6ad0")) },
  { key: "phoenix_feather", slot: "amulet", rarity: "epic", source: "jrpg", icon: icon("feather", EMBER) },
  { key: "wind_crystal_shard", slot: "amulet", rarity: "mythic", source: "jrpg", icon: icon("shard", JADE) },
  { key: "satella_tear", slot: "amulet", rarity: "legendary", source: "rezero", icon: icon("teardrop", pal("#3a2a5a", "#0e0818", "#8a6ad0", "#b07aff")) },

  // ───────── Fondos del menú ─────────
  {
    key: "axel_meadow", slot: "backdrop", rarity: "uncommon", source: "konosuba",
    icon: scene({ scene: "meadow", sky: ["#3a2a5a", "#d0603a", "#f0b060"], hills: ["#5a4a3a", "#3a4a2a", "#1e2a16"], glow: "#ffd080" }),
  },
  {
    key: "buena_forest", slot: "backdrop", rarity: "rare", source: "mushoku",
    icon: scene({ scene: "forest", sky: ["#0a1020", "#16283a", "#22403a"], hills: ["#1a2a2a", "#0e1c16", "#060c08"], glow: "#d8ff8a" }),
  },
  {
    key: "roswaal_manor", slot: "backdrop", rarity: "rare", source: "rezero",
    icon: scene({ scene: "mansion", sky: ["#080a1a", "#1a1a3a", "#3a2a4a"], hills: ["#14142a", "#0a0a16", "#05050c"], glow: "#ffd27a" }),
  },
  {
    key: "forbidden_library", slot: "backdrop", rarity: "epic", source: "rezero",
    icon: scene({ scene: "library", sky: ["#1a0e08", "#2a1a0e", "#3a2414"], hills: ["#2a1a10", "#4a2e1a", "#1a0e06"], glow: "#ffcf6a" }),
  },
  {
    key: "explosion_horizon", slot: "backdrop", rarity: "epic", source: "konosuba",
    icon: scene({ scene: "explosion", sky: ["#0e0610", "#3a0e1a", "#8a2a1a"], hills: ["#2a1010", "#180808", "#0a0404"], glow: "#ff6a2a" }),
  },
  {
    key: "zeal_sky_islands", slot: "backdrop", rarity: "mythic", source: "jrpg",
    icon: scene({ scene: "skyislands", sky: ["#3a6ab0", "#8ac0e8", "#e8f4ff"], hills: ["#4a7a4a", "#6aa060", "#5a4a3a"], glow: "#fff4c0" }),
  },
  {
    key: "crystal_star_sea", slot: "backdrop", rarity: "legendary", source: "jrpg",
    icon: scene({ scene: "starsea", sky: ["#02030a", "#0a1030", "#1a2a5a"], hills: ["#0a1430", "#14244a", "#050a18"], glow: "#7ae8ff" }),
  },

  // ───────── Emblemas ─────────
  { key: "guild_crest", slot: "emblem", rarity: "common", source: "guild", icon: icon("crest-swords", pal("#8a6a3a", "#2a1e10", "#e8c890", "#d6b25e")) },
  { key: "axis_seal", slot: "emblem", rarity: "uncommon", source: "konosuba", icon: icon("crest-drop", pal("#4aa8e0", "#0e2a46", "#c8eeff", "#ffffff")) },
  { key: "greyrat_crest", slot: "emblem", rarity: "rare", source: "mushoku", icon: icon("crest-quarters", pal("#5a6a8a", "#1a1e2e", "#c0c8e0", "#c8a040")) },
  { key: "crimson_demon_crest", slot: "emblem", rarity: "epic", source: "konosuba", icon: icon("crest-eye", pal("#c0303a", "#2a0608", "#ff8a7a", "#ffcf5a")) },
  { key: "lugunica_dragon", slot: "emblem", rarity: "mythic", source: "rezero", icon: icon("crest-dragon", pal("#c8a040", "#1e1608", "#fff0b0", "#d03040")) },
  { key: "loto_crest", slot: "emblem", rarity: "legendary", source: "jrpg", icon: icon("crest-bird", pal("#e8c040", "#0e1440", "#fff4b0", "#ff4a3a")) },
];
