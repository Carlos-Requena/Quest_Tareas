// Evento del objetivo de tipo lista. Se suma a la unión EventBody de src/domain/events.ts.

export type ChecklistEventBody = {
  type: "checklist_checked";
  questId: string;
  conditionId: string;
  itemId: string;
  /** Marcada (true) o desmarcada (false). */
  done: boolean;
};
