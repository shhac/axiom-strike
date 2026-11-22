import { boardTotal, emptied, EMPTY_EQUATION, freshTiles, type Board } from "./board";
import { filler, pairFor } from "./deal";
import { FIRST_LEVEL, levelAt, type LandId, type Level } from "./levels";
import { createRng, type Rng } from "./rng";

const LOCK_DIALS = 3;
const LOCK_HAND = 8;
/** Each of a land's three chests uses the numbers of a later level: its first, third and fifth. */
const GATE_STEPS = [0, 2, 4] as const;

/** A treasure chest's lock: three dials, each a number to make from one shared hand of tiles. */
export type Lock = Board & {
  level: Level;
  targets: number[];
  open: boolean[];
  /** The dial being worked on. */
  dial: number;
  nextId: number;
};

export const lockLevel = (land: LandId, gate: number): Level => levelAt(land, GATE_STEPS[gate] ?? 0) ?? FIRST_LEVEL;

/** A two-tile answer for every dial still shut, on separate tiles, topped up with spare numbers. */
const dealFor = (rng: Rng, level: Level, targets: readonly number[]): number[] => {
  const pairs = targets.flatMap((target) => pairFor(rng, level, target) ?? []);
  return rng.shuffle([...pairs, ...filler(rng, level, LOCK_HAND - pairs.length)]);
};

const firstShut = (open: readonly boolean[]) => Math.max(0, open.indexOf(false));

export const newLock = (level: Level, seed: number): Lock => {
  const rng = createRng(seed);
  const targets = rng.shuffle([...level.weakness]).slice(0, LOCK_DIALS);
  return {
    level,
    targets,
    open: targets.map(() => false),
    dial: 0,
    hand: freshTiles(dealFor(rng, level, targets), 1),
    equation: EMPTY_EQUATION,
    nextId: 1 + LOCK_HAND,
  };
};

export const pickDial = (lock: Lock, dial: number): Lock =>
  lock.open[dial] === false ? { ...lock, ...emptied(lock), dial } : lock;

/**
 * Tries the sum on the chosen dial. Right opens it and uses the tiles up; wrong hands them back,
 * so a chest can never be lost.
 */
export const tryDial = (lock: Lock): { lock: Lock; opened: boolean } => {
  const total = boardTotal(lock, lock.level.grain);
  const right = lock.equation.tiles.length >= 2 && total === lock.targets[lock.dial];
  if (!right) return { lock: { ...lock, ...emptied(lock) }, opened: false };
  const open = lock.open.map((isOpen, dial) => isOpen || dial === lock.dial);
  return { lock: { ...lock, open, dial: firstShut(open), equation: EMPTY_EQUATION }, opened: true };
};

export const isUnlocked = (lock: Lock) => lock.open.every(Boolean);

/** Fresh tiles for the dials still shut: the way out if the hand has been used up on the wrong sums. */
export const redealLock = (lock: Lock, seed: number): Lock => {
  const shut = lock.targets.filter((_, dial) => !lock.open[dial]);
  const hand = freshTiles(dealFor(createRng(seed), lock.level, shut), lock.nextId);
  return { ...lock, hand, equation: EMPTY_EQUATION, nextId: lock.nextId + hand.length };
};
