import { LEVELS, TIERS, tuneLevel, type Level } from "../src/engine/levels";

/** Every fractions level at every tier. */
export const fractionLevels = (): Level[] =>
  LEVELS.filter((level) => level.region === "frac").flatMap((level) => TIERS.map((tier) => tuneLevel(level, tier)));
