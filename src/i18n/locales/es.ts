// Diccionario de referencia: su forma define el tipo que deben cumplir los demás idiomas.
import { pomodoroEs } from "../../features/pomodoro/i18n";
import { musicEs } from "../../features/music/i18n";
import { itemsEs } from "../../features/items/i18n";
import { temporalEs } from "../../features/temporal/i18n";
import { complexEs } from "../../features/complex/i18n";
import { horizonEs } from "../../features/horizon/i18n";
import { merchantEs } from "../../features/merchant/i18n";
import { equipmentEs } from "../../features/equipment/i18n";
import { attributesEs } from "../../features/attributes/i18n";
import { armoryEs } from "../../features/armory/i18n";
import { checklistEs } from "../../features/checklist/i18n";
import { streaksEs } from "../../features/streaks/i18n";
import { chronicleEs } from "../../features/chronicle/i18n";
import { recoveryEs } from "../../features/recovery/i18n";
import { syncEs } from "../../features/sync/i18n";
import { mobileEs } from "../../features/mobile/i18n";

export const es = {
  app: {
    dbError: "No se pudo abrir la base de datos: {{error}}",
  },
  header: {
    adventurer: "Aventurero",
    rank: "Rango",
    level: "Nivel",
    treasure: "Tesoro",
    active: "En curso",
    xpTotal: "{{xp}} XP en total",
    activeTitle: "Quests en curso (sin límite)",
    soundOn: "Activar todo el sonido",
    mute: "Silenciar todo (efectos y música)",
    language: "Idioma (L)",
  },
  tabs: {
    all: "Todas",
    request: "Encargos",
    elite: "Élite",
    repeat: "Repetibles",
  },
  category: {
    elite: "Élite",
    repeat: "Repetible",
    request: "Encargo",
  },
  board: {
    onBoard: "{{n}} en el tablón",
  },
  card: {
    stamp: "EN CURSO",
    backIn: "Vuelve en {{time}}",
  },
  detail: {
    empty: "El tablón está vacío.",
    emptyHint: "Pulsa <kbd>N</kbd> para publicar una nueva quest.",
    reappears: "Reaparece tras {{time}}",
    once: "Una sola vez",
    completedTimes: " · completada ×{{n}}",
    client: "Encargado por",
    area: "Área",
    kind: "Tipo",
    description: "Descripción",
    conditions: "Objetivos",
    reward: "Recompensa",
    objective: "Objetivo",
    remove: "Quitar",
    add: "Añadir",
  },
  actions: {
    accept: "Aceptar",
    report: "Reportar",
    missing: "Faltan objetivos",
    availableIn: "Disponible en {{time}}",
    abandon: "Abandonar",
    retire: "Retirar del tablón",
    retireConfirm: "¿Seguro? Retirar",
  },
  toast: {
    accepted: "«{{title}}» aceptada",
    abandoned: "Has abandonado «{{title}}»",
    completed: "«{{title}}» completada",
    published: "«{{title}}» publicada en el tablón",
    retired: "«{{title}}» retirada del tablón",
  },
  footer: {
    acceptReport: "Aceptar / Reportar",
    abandon: "Abandonar",
    progress: "Progreso",
    category: "Categoría",
    newQuest: "Nueva quest",
    board: "Tablón",
  },
  modal: {
    subtitle: "Publicar quest",
    title: "Título",
    titlePh: "Derrotar al Dragón del Papeleo",
    category: "Categoría",
    client: "Encargado por",
    clientPh: "Gremio del Yo Adulto",
    area: "Área",
    areaPh: "Salud, Hogar…",
    kind: "Tipo",
    kindPh: "Entrenamiento",
    description: "Descripción",
    descriptionPh: "Cuenta la historia del encargo…",
    conditions: "Objetivos",
    conditionPh: "Leer páginas",
    conditionPhOther: "Otro objetivo",
    removeCondition: "Quitar objetivo",
    addCondition: "+ Añadir objetivo",
    xp: "Experiencia",
    gold: "Oro",
    publish: "publicar",
    close: "cerrar",
    cancel: "Cancelar",
    submit: "Publicar quest",
  },
  cooldowns: {
    hours_one: "{{count}} hora",
    hours_other: "{{count}} horas",
    days_one: "{{count}} día",
    days_other: "{{count}} días",
    week: "1 semana",
    daily: "{{label}} (diaria)",
  },
  clear: {
    completed: "«{{title}}» completada",
    xp: "Experiencia",
    gold: "Oro",
    level: "Nivel",
    hint: "Pulsa <kbd>Enter</kbd> para continuar",
  },
  time: {
    minutes: "{{n}} min",
    hours: "{{n}} h",
    hoursMinutes: "{{h}} h {{m}} min",
    days: "{{n}} d",
    daysHours: "{{d}} d {{h}} h",
  },
  // Textos de cada funcionalidad (src/features/*/i18n.ts)
  pomodoro: pomodoroEs,
  music: musicEs,
  items: itemsEs,
  temporal: temporalEs,
  complex: complexEs,
  horizon: horizonEs,
  merchant: merchantEs,
  equipment: equipmentEs,
  attributes: attributesEs,
  armory: armoryEs,
  checklist: checklistEs,
  streaks: streaksEs,
  chronicle: chronicleEs,
  recovery: recoveryEs,
  sync: syncEs,
  mobile: mobileEs,
  // Quests de ejemplo que se crean en el primer arranque, en el idioma activo.
  seed: {
    dragon: {
      title: "Derrotar al Dragón del Papeleo",
      client: "Gremio del Yo Adulto",
      area: "Administración",
      kind: "Trámite",
      description:
        "La pila de papeles de la mesa no deja de crecer.\nDicen que si se deja un mes más cobrará vida propia.\nAcaba con ella antes de que sea tarde.",
      conditions: ["Clasificar documentos", "Pagar facturas pendientes"],
    },
    tower: {
      title: "Asalto a la Torre del Proyecto",
      client: "Academia del Foco",
      area: "Estudio",
      kind: "Asedio",
      description:
        "En lo alto de la torre aguarda el proyecto final.\nSolo quien mantenga la concentración llegará a la cima.",
      conditions: ["Sesiones de foco"],
    },
    gym: {
      title: "Patrulla del Gimnasio",
      client: "Cuartel del Cuerpo",
      area: "Salud",
      kind: "Entrenamiento",
      description: "El cuartel necesita patrullas diarias.\nUn guerrero que no entrena pierde su filo.",
      conditions: ["Entrenar", "Estirar 10 minutos"],
    },
    library: {
      title: "Guardia en la Biblioteca",
      client: "Biblioteca Arcana",
      area: "Lectura",
      kind: "Estudio",
      description:
        "Los tomos antiguos piden ser leídos.\nCada página leída refuerza los sellos de la biblioteca.",
      conditions: ["Leer páginas"],
    },
    market: {
      title: "Recado del Mercado",
      client: "Taberna de Casa",
      area: "Hogar",
      kind: "Entrega",
      description:
        "Perdona, se nos han acabado los ingredientes para la cena.\n¿Podrías pasarte por el mercado?\nHay comida caliente y una recompensa esperándote.",
      conditions: ["Fruta", "Verduras"],
    },
  },
};

export type Translation = typeof es;
