import type { Op } from "./equation";
import type { Level } from "./levels";
import type { Rng } from "./rng";

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

/** Two tiles that make `target`, with the level's focus operator if it can, or null if none can. */
const pairFor = (rng: Rng, level: Level, target: number): Pair | null => {
  const others = rng.shuffle(level.ops.filter((op) => op !== level.focus));
  const candidates = [level.focus, ...others];
  return candidates.reduce<Pair | null>((found, op) => found ?? PAIR_FOR[op](rng, target, level.tileMax), null);
};

const splitTile = (rng: Rng, value: number): Pair | null => {
  if (value < 2) return null;
  const a = rng.int(1, value - 1);
  return [a, value - a];
};

/**
 * Deals a hand that always contains an exact two-tile answer for `strikeTarget` and for each of
 * `parryTargets` (the attacks landing this turn, at most two). Spare slots first go to a
 * three-tile answer for the strike, so a longer equation is on offer whenever there is room.
 */
export const dealHand = (rng: Rng, level: Level, strikeTarget: number, parryTargets: readonly number[]): number[] => {
  const strike = pairFor(rng, level, strikeTarget) ?? [];
  const parries = parryTargets.slice(0, 2).flatMap((target) => pairFor(rng, level, target) ?? []);
  const guaranteed = [...strike, ...parries];

  const spare = HAND_SIZE - guaranteed.length;
  const addend = level.ops.includes("+") && spare >= 2 ? strike[1] : undefined;
  const combo = addend === undefined ? [] : (splitTile(rng, addend) ?? []);

  const fixed = [...guaranteed, ...combo];
  const filler = Array.from({ length: HAND_SIZE - fixed.length }, () => rng.int(1, level.tileMax));
  return rng.shuffle([...fixed, ...filler]);
};

/**
 * `count` replacement tiles for an "Impossible!" call that was right. They include an exact
 * two-tile answer for `target` whenever there is room for one.
 */
export const dealSwap = (rng: Rng, level: Level, target: number, count: number): number[] => {
  const pair = pairFor(rng, level, target) ?? [];
  const filler = Array.from({ length: Math.max(0, count - pair.length) }, () => rng.int(1, level.tileMax));
  return rng.shuffle([...pair, ...filler]).slice(0, count);
};
