/** A fresh seed for something that should differ every time. The engine itself stays seeded and pure. */
export const randomSeed = (): number => Math.floor(Math.random() * 2 ** 31);
