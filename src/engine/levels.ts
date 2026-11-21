import type { Op } from "./equation";

export type EnemyKind = "minion" | "standard" | "boss";

export type OpFamily = "add" | "sub" | "mul" | "div";

/** One value for each kind of sum; a new family then has to be given one everywhere. */
export const perFamily = <T>(make: (family: OpFamily) => T): Record<OpFamily, T> => ({
  add: make("add"),
  sub: make("sub"),
  mul: make("mul"),
  div: make("div"),
});

export type EnemySpec = { kind: EnemyKind; family: OpFamily };

export type Level = {
  id: string;
  name: string;
  region: OpFamily;
  /** Position within its region, from 0. */
  step: number;
  ops: readonly Op[];
  /** The operator this level is teaching; dealt answers use it whenever they can. */
  focus: Op;
  /** Largest number that can appear on a tile. */
  tileMax: number;
  /** Numbers a weakness can be. */
  weakness: readonly number[];
  /** Numbers an attack can be. An attack lands for its number. */
  attack: readonly number[];
  /** Ignored attacks only grow where two added tiles can still answer the bigger number. */
  rage: boolean;
  waves: readonly (readonly EnemySpec[])[];
};

export type Region = { id: OpFamily; name: string; focus: Op; ops: readonly Op[] };

export const REGIONS: readonly Region[] = [
  { id: "add", name: "Addition Grove", focus: "+", ops: ["+"] },
  { id: "sub", name: "Subtraction Peaks", focus: "-", ops: ["+", "-"] },
  { id: "mul", name: "Multiplication Caverns", focus: "×", ops: ["+", "×"] },
  { id: "div", name: "Division Depths", focus: "÷", ops: ["+", "×", "÷"] },
];

export const ENEMY_HP: Record<EnemyKind, number> = { minion: 20, standard: 40, boss: 100 };

const range = (min: number, max: number) => Array.from({ length: max - min + 1 }, (_, i) => min + i);

const products = (maxFactor: number, limit = Infinity) =>
  [...new Set(range(2, maxFactor).flatMap((a) => range(2, maxFactor).map((b) => a * b)))].filter((n) => n <= limit);

type Numbers = Pick<Level, "tileMax" | "weakness" | "attack">;

/** Five steps per region, each a little bigger than the last. */
const NUMBERS: Record<OpFamily, readonly Numbers[]> = {
  add: [
    { tileMax: 9, weakness: range(5, 14), attack: range(4, 12) },
    { tileMax: 10, weakness: range(6, 16), attack: range(5, 14) },
    { tileMax: 12, weakness: range(8, 20), attack: range(6, 16) },
    { tileMax: 15, weakness: range(10, 25), attack: range(8, 20) },
    { tileMax: 20, weakness: range(12, 30), attack: range(10, 24) },
  ],
  sub: [
    { tileMax: 12, weakness: range(2, 10), attack: range(3, 10) },
    { tileMax: 15, weakness: range(3, 12), attack: range(4, 12) },
    { tileMax: 20, weakness: range(4, 16), attack: range(5, 14) },
    { tileMax: 25, weakness: range(5, 20), attack: range(6, 18) },
    { tileMax: 30, weakness: range(6, 25), attack: range(8, 22) },
  ],
  mul: [
    { tileMax: 5, weakness: products(5), attack: products(5, 12) },
    { tileMax: 6, weakness: products(6), attack: products(6, 16) },
    { tileMax: 8, weakness: products(8), attack: products(8, 18) },
    { tileMax: 10, weakness: products(10), attack: products(10, 20) },
    { tileMax: 12, weakness: products(12), attack: products(12, 24) },
  ],
  div: [
    { tileMax: 20, weakness: range(2, 6), attack: range(2, 8) },
    { tileMax: 30, weakness: range(2, 8), attack: range(2, 10) },
    { tileMax: 40, weakness: range(2, 10), attack: range(3, 10) },
    { tileMax: 50, weakness: range(3, 10), attack: range(3, 12) },
    { tileMax: 60, weakness: range(3, 12), attack: range(4, 12) },
  ],
};

const NAMES: Record<OpFamily, readonly string[]> = {
  add: ["Sprout Path", "Leaf Trail", "Branch Climb", "Canopy Reach", "Grove Guardian"],
  sub: ["Ember Foothills", "Ash Slope", "Lava Ridge", "Cinder Pass", "Peak Warden"],
  mul: ["Crystal Entry", "Gem Tunnel", "Prism Hall", "Echo Chamber", "Cavern King"],
  div: ["Tide Pools", "Current Stream", "Whirlpool Basin", "Abyssal Trench", "Depth Guardian"],
};

/** An earlier land's monsters wander into later lands, so old skills keep being used. */
const VISITOR: Record<OpFamily, OpFamily> = { add: "add", sub: "add", mul: "sub", div: "mul" };

const wavesFor = (region: OpFamily, step: number): EnemySpec[][] => {
  const own = (kind: EnemyKind): EnemySpec => ({ kind, family: region });
  const visitor = (kind: EnemyKind): EnemySpec => ({ kind, family: VISITOR[region] });
  const shapes: EnemySpec[][][] = [
    [
      [own("minion"), own("minion")],
      [own("standard"), visitor("minion")],
      [own("standard"), own("minion"), own("standard")],
    ],
    [
      [own("minion"), visitor("minion")],
      [own("standard"), own("minion")],
      [own("standard"), own("standard"), own("minion")],
    ],
    [
      [own("standard"), own("minion")],
      [own("standard"), visitor("standard")],
      [own("standard"), own("minion"), own("standard")],
    ],
    [
      [own("standard"), visitor("minion")],
      [own("standard"), own("standard"), own("minion")],
      [own("standard"), own("standard"), visitor("standard")],
    ],
    [
      [own("standard"), own("minion")],
      [own("standard"), own("standard"), visitor("minion")],
      [own("boss"), own("minion")],
    ],
  ];
  return shapes[step] ?? shapes[0]!;
};

export const LEVELS: readonly Level[] = REGIONS.flatMap((region) =>
  NUMBERS[region.id].map((numbers, step): Level => ({
    id: `${region.id}_${step + 1}`,
    name: NAMES[region.id][step] ?? region.name,
    region: region.id,
    step,
    ops: region.ops,
    focus: region.focus,
    rage: region.id === "add" || region.id === "sub",
    waves: wavesFor(region.id, step),
    ...numbers,
  })),
);

export const TIERS = ["gentle", "standard", "tough"] as const;
export type Tier = (typeof TIERS)[number];

/** How many steps a tier sits from the level as designed. */
export const TIER_STEP: Record<Tier, number> = { gentle: -1, standard: 0, tough: 1 };

/** One band easier than a land's first step and one harder than its last, so every level can flex. */
const BEYOND: Record<OpFamily, { below: Numbers; above: Numbers }> = {
  add: {
    // Any smaller than this and tapping two tiles at random starts to win.
    below: { tileMax: 8, weakness: range(4, 12), attack: range(3, 10) },
    above: { tileMax: 25, weakness: range(15, 40), attack: range(12, 28) },
  },
  sub: {
    below: { tileMax: 10, weakness: range(1, 8), attack: range(2, 8) },
    above: { tileMax: 40, weakness: range(8, 30), attack: range(10, 26) },
  },
  mul: {
    below: { tileMax: 4, weakness: products(4), attack: products(4, 9) },
    above: { tileMax: 12, weakness: products(12, 144).filter((n) => n >= 12), attack: products(12, 30) },
  },
  div: {
    below: { tileMax: 12, weakness: range(2, 5), attack: range(2, 6) },
    above: { tileMax: 72, weakness: range(4, 12), attack: range(5, 14) },
  },
};

/**
 * The same level with the number sizes of the step before or after it in its land. Waves and
 * signs stay as they are, and the three number lists always move together.
 */
export const tuneLevel = (level: Level, tier: Tier): Level => {
  if (tier === "standard") return level;
  const { below, above } = BEYOND[level.region];
  const bands = [below, ...NUMBERS[level.region], above];
  const numbers = bands[level.step + 1 + TIER_STEP[tier]];
  return numbers ? { ...level, ...numbers } : level;
};

export const FIRST_LEVEL: Level = LEVELS[0]!;

/** An unknown id falls back to the first level rather than failing. */
export const findLevel = (id: string): Level => LEVELS.find((level) => level.id === id) ?? FIRST_LEVEL;

export const nextLevel = (level: Level): Level | null =>
  LEVELS.find((candidate) => candidate.region === level.region && candidate.step === level.step + 1) ?? null;
