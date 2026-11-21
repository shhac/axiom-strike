export type Rng = {
  next: () => number;
  int: (min: number, max: number) => number;
  pick: <T>(items: readonly T[]) => T;
  shuffle: <T>(items: readonly T[]) => T[];
};

export const createRng = (seed: number): Rng => {
  const state = { a: seed >>> 0 };
  const next = () => {
    state.a = (state.a + 0x6d2b79f5) >>> 0;
    const t = Math.imul(state.a ^ (state.a >>> 15), 1 | state.a);
    const u = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((u ^ (u >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  const pick = <T>(items: readonly T[]): T => {
    const item = items[int(0, items.length - 1)];
    if (item === undefined) throw new Error("pick from empty list");
    return item;
  };
  const shuffle = <T>(items: readonly T[]): T[] =>
    items
      .map((item) => ({ item, key: next() }))
      .sort((x, y) => x.key - y.key)
      .map(({ item }) => item);
  return { next, int, pick, shuffle };
};
