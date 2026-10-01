import type { EventBody } from "./events";
import type { QuestDef } from "./types";
import { uid } from "../lib/id";

type SeedQuest = Omit<QuestDef, "id" | "createdAt" | "conditions"> & {
  conditions: [string, number][];
};

const SEED: SeedQuest[] = [
  {
    title: "Derrotar al Dragón del Papeleo",
    category: "elite",
    client: "Gremio del Yo Adulto",
    area: "Administración",
    kind: "Trámite",
    description:
      "La pila de papeles de la mesa no deja de crecer.\nDicen que si se deja un mes más cobrará vida propia.\nAcaba con ella antes de que sea tarde.",
    conditions: [
      ["Clasificar documentos", 1],
      ["Pagar facturas pendientes", 3],
    ],
    reward: { xp: 400, gold: 250, item: "Sello del Archivero" },
  },
  {
    title: "Asalto a la Torre del Proyecto",
    category: "elite",
    client: "Academia del Foco",
    area: "Estudio",
    kind: "Asedio",
    description:
      "En lo alto de la torre aguarda el proyecto final.\nSolo quien mantenga la concentración llegará a la cima.",
    conditions: [["Sesiones de 50 min de foco", 5]],
    reward: { xp: 500, gold: 300, item: "Pluma de Fénix" },
  },
  {
    title: "Patrulla del Gimnasio",
    category: "repeat",
    client: "Cuartel del Cuerpo",
    area: "Salud",
    kind: "Entrenamiento",
    description:
      "El cuartel necesita patrullas diarias.\nUn guerrero que no entrena pierde su filo.",
    conditions: [
      ["Entrenar", 1],
      ["Estirar 10 minutos", 1],
    ],
    reward: { xp: 120, gold: 60, item: "Poción de Vigor" },
    cooldownMinutes: 20 * 60,
  },
  {
    title: "Guardia en la Biblioteca",
    category: "repeat",
    client: "Biblioteca Arcana",
    area: "Lectura",
    kind: "Estudio",
    description:
      "Los tomos antiguos piden ser leídos.\nCada página leída refuerza los sellos de la biblioteca.",
    conditions: [["Leer páginas", 20]],
    reward: { xp: 80, gold: 40 },
    cooldownMinutes: 20 * 60,
  },
  {
    title: "Recado del Mercado",
    category: "request",
    client: "Taberna de Casa",
    area: "Hogar",
    kind: "Entrega",
    description:
      "Perdona, se nos han acabado los ingredientes para la cena.\n¿Podrías pasarte por el mercado?\nHay comida caliente y una recompensa esperándote.",
    conditions: [
      ["Fruta", 3],
      ["Verduras", 3],
    ],
    reward: { xp: 150, gold: 80, item: "Ingredientes frescos" },
  },
];

export function seedEvents(): EventBody[] {
  const now = Date.now();
  return SEED.map((s, i) => ({
    type: "quest_created",
    quest: {
      ...s,
      id: uid(),
      createdAt: now + i,
      conditions: s.conditions.map(([label, target]) => ({ id: uid(), label, target })),
    },
  }));
}
