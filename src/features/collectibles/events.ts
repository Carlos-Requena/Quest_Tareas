// Eventos de la oferta de coleccionables. Se suman a la unión EventBody de src/domain/events.ts.

/** Compra del coleccionable ofrecido. El precio se copia: cambiarlo después no altera lo pagado. */
export type CollectibleEventBody = { type: "collectible_purchased"; itemId: string; price: number };
