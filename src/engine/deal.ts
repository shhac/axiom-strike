import type { Op } from "./equation";
import type { Level } from "./levels";
import { createRng, type Rng } from "./rng";

export const HAND_SIZE = 7;

type Pair = readonly [number, number];

const PAIR_FOR: Record<Op, (rng: Rng, target: number, tileMax: number) => Pair | null> = {
  "+": (rng, target, tileMax) => {
    const low = Math.max(1, target - tileMax);
    const high = Math.min(tileMax, target - 1);
    if (low > high) return null;
    const a = rng.int(low, high);
    return [a, target - a];
  },
  "-": (rng, target, tileMax) => {
    if (target + 1 > tileMax) return null;
    const b = rng.int(1, tileMax - target);
    return [target + b, b];
  },
  "×": (rng, target, tileMax) => {
    const factors = Array.from({ length: tileMax - 1 }, (_, i) => i + 2).filter(
      (f) => target % f === 0 && target / f >= 2 && target / f <= tileMax,
    );
    if (factors.length === 0) return null;
    const a = rng.pick(factors);
    return [a, target / a];
  },
  "÷": (rng, target, tileMax) => {
    const maxDivisor = Math.floor(tileMax / target);
    if (maxDivisor < 2) return null;
    const b = rng.int(2, maxDivisor);
    return [target * b, b];
  },
};

const grainOf = (level: Level) => level.grain ?? 1;

/** Adding and taking away work the same counted in halves or quarters; times and divide do not. */
const SCALES: readonly Op[] = ["+", "-"];

/**
 * Two tiles that make `target` with one sign, or null if that sign cannot. Lands that count in
 * halves or quarters are dealt in units of their grain, so the same whole-number rules apply.
 */
const pairWith = (rng: Rng, level: Level, op: Op, target: number): Pair | null => {
  const grain = grainOf(level);
  if (grain !== 1 && !SCALES.includes(op)) return null;
  const pair = PAIR_FOR[op](rng, target / grain, level.tileMax / grain);
  return pair && [pair[0] * grain, pair[1] * grain];
};

/**
 * Two tiles that make `target`, with the level's focus operator if it can, or null if none can.
 * `banned` leaves a sign out, for a monster that will not stand for it.
 */
export const pairFor = (rng: Rng, level: Level, target: number, banned?: Op): Pair | null => {
  const others = rng.shuffle(level.ops.filter((op) => op !== level.focus));
  const candidates = [level.focus, ...others].filter((op) => op !== banned);
  return candidates.reduce<Pair | null>((found, op) => found ?? pairWith(rng, level, op, target), null);
};

/** Whether two tiles can make `target` in this level without the `banned` sign. Draws nothing from the seed. */
export const canPair = (level: Level, target: number, banned?: Op): boolean =>
  pairFor(createRng(1), level, target, banned) !== null;

const splitTile = (rng: Rng, level: Level, value: number): Pair | null => {
  const grain = grainOf(level);
  const units = value / grain;
  if (units < 2) return null;
  const a = rng.int(1, units - 1);
  return [a * grain, (units - a) * grain];
};

const filler = (rng: Rng, level: Level, count: number): number[] => {
  const grain = grainOf(level);
  return Array.from({ length: Math.max(0, count) }, () => rng.int(1, level.tileMax / grain) * grain);
};

/**
 * Deals a hand that always contains an exact two-tile answer for `strikeTarget` and for each of
 * `parryTargets` (the attacks landing this turn, at most two). Spare slots first go to a
 * three-tile answer for the strike, so a longer equation is on offer whenever there is room.
 */
export const dealHand = (
  rng: Rng,
  level: Level,
  strikeTarget: number,
  parryTargets: readonly number[],
  banned?: Op,
): number[] => {
  const strike = pairFor(rng, level, strikeTarget, banned) ?? [];
  const parries = parryTargets.slice(0, 2).flatMap((target) => pairFor(rng, level, target) ?? []);
  const guaranteed = [...strike, ...parries];

  const spare = HAND_SIZE - guaranteed.length;
  const addend = level.ops.includes("+") && banned !== "+" && spare >= 2 ? strike[1] : undefined;
  const combo = addend === undefined ? [] : (splitTile(rng, level, addend) ?? []);

  const fixed = [...guaranteed, ...combo];
  return rng.shuffle([...fixed, ...filler(rng, level, HAND_SIZE - fixed.length)]);
};

/**
 * `count` replacement tiles for an "Impossible!" call that was right. They include an exact
 * two-tile answer for `target` whenever there is room for one.
 */
export const dealSwap = (rng: Rng, level: Level, target: number, count: number, banned?: Op): number[] => {
  const pair = pairFor(rng, level, target, banned) ?? [];
  return rng.shuffle([...pair, ...filler(rng, level, count - pair.length)]).slice(0, count);
};
