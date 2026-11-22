import type { Op } from "./equation";

export type EnemyKind = "minion" | "standard" | "boss";

/** A kind of monster: its look, name and lines. Four came with the first lands; fractions brought its own. */
export type OpFamily = "add" | "sub" | "mul" | "div" | "frac";

export const FAMILIES: readonly OpFamily[] = ["add", "sub", "mul", "div", "frac"];

/** A land on the map: a set of five levels teaching one kind of sum. */
export type LandId = "add" | "sub" | "mul" | "div" | "big" | "frac";

/** One value for each land; a new land then has to be given one everywhere. */
export const perLand = <T>(make: (land: LandId) => T): Record<LandId, T> => ({
  add: make("add"),
  sub: make("sub"),
  mul: make("mul"),
  div: make("div"),
  big: make("big"),
  frac: make("frac"),
});

/** Something that makes a monster play differently; see "Monster quirks" in the design doc. */
export type Quirk = "helmet" | "noPlus";

export type EnemySpec = { kind: EnemyKind; family: OpFamily; quirk?: Quirk };

export type Level = {
  id: string;
  name: string;
  region: LandId;
  /** Position within its region, from 0. */
  step: number;
  ops: readonly Op[];
  /** The operator this level is teaching; dealt answers use it whenever they can. */
  focus: Op;
  /** The smallest step a number may be: 1 unless the land deals in halves (0.5) or quarters (0.25). */
  grain?: number;
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

/**
 * `name` is the land's full name; `label` the one word beside its sign on the map; `sign` what is
 * drawn for it. `page` is which map it is on, and `opensAt` the stars in total needed to enter.
 */
export type Region = {
  id: LandId;
  name: string;
  label: string;
  sign: string;
  focus: Op;
  ops: readonly Op[];
  page: number;
  opensAt: number;
};

const land = (id: LandId, name: string, label: string, sign: string, focus: Op, ops: readonly Op[]): Region => ({
  id,
  name,
  label,
  sign,
  focus,
  ops,
  page: 0,
  opensAt: 0,
});

export const REGIONS: readonly Region[] = [
  land("add", "Addition Grove", "Addition", "+", "+", ["+"]),
  land("sub", "Subtraction Peaks", "Subtraction", "-", "-", ["+", "-"]),
  land("mul", "Multiplication Caverns", "Multiplication", "×", "×", ["+", "×"]),
  land("div", "Division Depths", "Division", "÷", "÷", ["+", "×", "÷"]),
  { ...land("big", "Giant Peaks", "Big Numbers", "100", "+", ["+", "-", "×", "÷"]), page: 1, opensAt: 20 },
  { ...land("frac", "Fraction Fields", "Fractions", "½", "+", ["+", "-"]), page: 1, opensAt: 30 },
];

export const findRegion = (id: LandId): Region => REGIONS.find((region) => region.id === id) ?? REGIONS[0]!;

export const ENEMY_HP: Record<EnemyKind, number> = { minion: 20, standard: 40, boss: 100 };

const range = (min: number, max: number) => Array.from({ length: max - min + 1 }, (_, i) => min + i);

/** Every number from `min` to `max` in steps of `grain`, for lands that count in halves or quarters. */
const steps = (min: number, max: number, grain: number) => range(min / grain, max / grain).map((n) => n * grain);

const products = (maxFactor: number, limit = Infinity) =>
  [...new Set(range(2, maxFactor).flatMap((a) => range(2, maxFactor).map((b) => a * b)))].filter((n) => n <= limit);

type Numbers = Pick<Level, "tileMax" | "weakness" | "attack" | "grain">;

/** Five steps per region, each a little bigger than the last. */
const NUMBERS: Record<LandId, readonly Numbers[]> = {
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
  // A weakness never passes twice the biggest tile, so two added tiles can always make it.
  big: [
    { tileMax: 20, weakness: range(20, 40), attack: range(10, 20) },
    { tileMax: 25, weakness: range(25, 50), attack: range(12, 22) },
    { tileMax: 30, weakness: range(30, 60), attack: range(14, 24) },
    { tileMax: 40, weakness: range(40, 80), attack: range(16, 26) },
    { tileMax: 50, weakness: range(50, 100), attack: range(18, 30) },
  ],
  // Halves first, then quarters. Attacks stay whole numbers so health never has a fraction in it.
  frac: [
    { grain: 0.5, tileMax: 4, weakness: steps(2, 7.5, 0.5), attack: range(4, 8) },
    { grain: 0.5, tileMax: 5, weakness: steps(2.5, 9.5, 0.5), attack: range(5, 10) },
    { grain: 0.25, tileMax: 5, weakness: steps(2.25, 9.75, 0.25), attack: range(6, 10) },
    { grain: 0.25, tileMax: 6, weakness: steps(3, 11.75, 0.25), attack: range(6, 12) },
    { grain: 0.25, tileMax: 7, weakness: steps(3.5, 13.75, 0.25), attack: range(7, 13) },
  ],
};

const NAMES: Record<LandId, readonly string[]> = {
  add: ["Sprout Path", "Leaf Trail", "Branch Climb", "Canopy Reach", "Grove Guardian"],
  sub: ["Ember Foothills", "Ash Slope", "Lava Ridge", "Cinder Pass", "Peak Warden"],
  mul: ["Crystal Entry", "Gem Tunnel", "Prism Hall", "Echo Chamber", "Cavern King"],
  div: ["Tide Pools", "Current Stream", "Whirlpool Basin", "Abyssal Trench", "Depth Guardian"],
  big: ["Boulder Gate", "Tall Pines", "Stone Stair", "Cloud Bridge", "Giant's Throne"],
  frac: ["Half Moon Hill", "Picnic Meadow", "Quarter Pond", "Layer Cake Rise", "The Whole Cake"],
};

/**
 * Which monsters live in each level of a land, as [its own, a visitor]. An earlier land's monsters
 * wander into later ones, so old skills keep being used; every kind gathers on the Giant Peaks.
 */
const RESIDENTS: Record<LandId, readonly (readonly [OpFamily, OpFamily])[]> = {
  add: [["add", "add"]],
  sub: [["sub", "add"]],
  mul: [["mul", "sub"]],
  div: [["div", "mul"]],
  big: [
    ["add", "sub"],
    ["sub", "mul"],
    ["mul", "div"],
    ["div", "add"],
    ["mul", "sub"],
  ],
  frac: [["frac", "frac"]],
};

const wavesFor = (region: Region, step: number): EnemySpec[][] => {
  const residents = RESIDENTS[region.id];
  const [ownFamily, visitorFamily] = residents[step % residents.length] ?? ["add", "add"];
  const own = (kind: EnemyKind, quirk?: Quirk): EnemySpec => ({ kind, family: ownFamily, ...(quirk ? { quirk } : {}) });
  const visitor = (kind: EnemyKind): EnemySpec => ({ kind, family: visitorFamily });
  // A monster can only hate `+` where the land has another sign to use instead.
  const hater: Quirk = region.ops.length > 1 ? "noPlus" : "helmet";
  // Quirks start at a land's third level, one monster at a time, so each is met alone first.
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
      [own("standard", "helmet"), visitor("standard")],
      [own("standard"), own("minion"), own("standard")],
    ],
    [
      [own("standard", hater), visitor("minion")],
      [own("standard"), own("standard"), own("minion")],
      [own("standard", "helmet"), own("standard"), visitor("standard")],
    ],
    [
      [own("standard", "helmet"), own("minion")],
      [own("standard"), own("standard", hater), visitor("minion")],
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
    waves: wavesFor(region, step),
    ...numbers,
  })),
);

export const TIERS = ["gentle", "standard", "tough"] as const;
export type Tier = (typeof TIERS)[number];

/** How many steps a tier sits from the level as designed. */
export const TIER_STEP: Record<Tier, number> = { gentle: -1, standard: 0, tough: 1 };

/** One band easier than a land's first step and one harder than its last, so every level can flex. */
const BEYOND: Record<LandId, { below: Numbers; above: Numbers }> = {
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
  big: {
    below: { tileMax: 15, weakness: range(15, 30), attack: range(8, 18) },
    above: { tileMax: 60, weakness: range(60, 120), attack: range(20, 34) },
  },
  frac: {
    // Any smaller and tapping two tiles at random starts to win, as in the first land.
    below: { grain: 0.5, tileMax: 4, weakness: steps(1.5, 7.5, 0.5), attack: range(3, 7) },
    above: { grain: 0.25, tileMax: 8, weakness: steps(4, 15.75, 0.25), attack: range(8, 14) },
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
