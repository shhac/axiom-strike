import { applyStep, type Op } from "../src/engine/equation";
import { LEVELS, TIERS, tuneLevel, type Level } from "../src/engine/levels";

/** Every fractions level at every tier. */
export const fractionLevels = (): Level[] =>
  LEVELS.filter((level) => level.region === "frac").flatMap((level) => TIERS.map((tier) => tuneLevel(level, tier)));

/** True if every target has its own two-tile exact answer, with no tile shared between them. */
export const separateAnswers = (
  hand: readonly number[],
  ops: readonly Op[],
  targets: readonly number[],
  used: readonly number[],
  grain = 1,
): boolean => {
  const [target, ...rest] = targets;
  if (target === undefined) return true;
  const free = hand.flatMap((_, index) => (used.includes(index) ? [] : [index]));
  return free.some((i) =>
    free.some(
      (j) =>
        i !== j &&
        ops.some((op) => applyStep(hand[i]!, { op, value: hand[j]! }, grain) === target) &&
        separateAnswers(hand, ops, rest, [...used, i, j], grain),
    ),
  );
};
