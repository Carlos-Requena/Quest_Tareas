// Solo para tests: sonido mudo (en Node no hay AudioContext). Cualquier efecto, sfx.loQueSea(), no hace nada.
export const sfxMock = () => ({
  isMuted: () => true,
  setMuted: () => {},
  onMutedChange: () => () => {},
  sfx: new Proxy({}, { get: () => () => {} }),
});
