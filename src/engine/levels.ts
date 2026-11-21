import type { Op } from "./equation";

export type EnemyKind = "minion" | "standard" | "boss";

export type OpFamily = "add" | "sub" | "mul" | "div";

export type EnemySpec = { kind: EnemyKind; family: OpFamily };

export type Range = readonly [min: number, max: number];

export type Level = {
  id: string;
  name: string;
  ops: readonly Op[];
  /** Largest number that can appear on a tile. */
  tileMax: number;
  weakness: Range;
  attack: Range;
  waves: readonly (readonly EnemySpec[])[];
};

export const ENEMY_HP: Record<EnemyKind, number> = { minion: 20, standard: 40, boss: 100 };

const add = (kind: EnemyKind): EnemySpec => ({ kind, family: "add" });
const sub = (kind: EnemyKind): EnemySpec => ({ kind, family: "sub" });

export const LEVELS: readonly Level[] = [
  {
    id: "add_1",
    name: "Sprout Path",
    ops: ["+"],
    tileMax: 9,
    weakness: [5, 14],
    attack: [4, 12],
    waves: [
      [add("minion"), add("minion")],
      [add("standard"), add("minion")],
      [add("standard"), add("minion"), add("standard")],
    ],
  },
  {
    id: "sub_1",
    name: "Ember Foothills",
    ops: ["+", "-"],
    tileMax: 15,
    weakness: [6, 20],
    attack: [5, 16],
    waves: [
      [sub("minion"), add("minion")],
      [sub("standard"), sub("minion"), add("minion")],
      [sub("boss"), sub("minion")],
    ],
  },
];

export const findLevel = (id: string | null): Level => LEVELS.find((level) => level.id === id) ?? LEVELS[0]!;
