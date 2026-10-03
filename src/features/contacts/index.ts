// API pública de los contactos para la interfaz.
// OJO: src/domain no debe importar este archivo (crearía un ciclo con el store);
// el dominio importa directamente ./model.

export * from "./model";
export { openContact, copyContact } from "./actions";
export { ContactsField } from "./components/ContactsField";
export { ContactList } from "./components/ContactList";
export { ContactIcon } from "./components/ContactIcon";
