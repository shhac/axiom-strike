import { boardTotals, clearBoard, EMPTY_EQUATION, freshTiles, sumPower, type Board } from "./board";
import { dealHand } from "./deal";
import type { Level } from "./levels";
import { createRng } from "./rng";

export const PRACTICE_SECONDS = 60;
/** A longer sum is worth more, as it is in battle. */
const LONG_SUM = 3;

/** Target practice: one number to make after another against the clock, with no monsters. */
export type Practice = Board & {
  level: Level;
  target: number;
  score: number;
  made: number;
  seed: number;
  nextId: number;
};

const round = (level: Level, seed: number, nextId: number) => {
  const rng = createRng(seed);
  const target = rng.pick(level.weakness);
  const hand = freshTiles(dealHand(rng, level, target, []), nextId);
  return {
    target,
    hand,
    equation: EMPTY_EQUATION,
    seed: Math.floor(rng.next() * 2 ** 31),
    nextId: nextId + hand.length,
  };
};

export const newPractice = (level: Level, seed: number): Practice => ({
  level,
  score: 0,
  made: 0,
  ...round(level, seed, 1),
});

export const skipTarget = (practice: Practice): Practice => ({
  ...practice,
  ...round(practice.level, practice.seed, practice.nextId),
});

/** An exact sum scores and brings the next number; anything else just hands the tiles back. */
export const shoot = (practice: Practice): { practice: Practice; gained: number } => {
  const totals = boardTotals(practice, practice.level.grain);
  const hit = practice.equation.tiles.length >= 2 && totals.at(-1) === practice.target;
  if (!hit) return { practice: { ...practice, ...(clearBoard(practice) ?? {}) }, gained: 0 };
  const gained = sumPower(totals) >= LONG_SUM ? 2 : 1;
  const next = skipTarget(practice);
  return { practice: { ...next, score: practice.score + gained, made: practice.made + 1 }, gained };
};
