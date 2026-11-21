import { aimTarget, equationTotal, type BattleState } from "./battle";
import { TIER_STEP, type Level, type Tier } from "./levels";
import { solve } from "./solver";

/** How well a player is doing at one kind of question, on the Elo scale. */
export type Skill = { rating: number; attempts: number };

export const START_RATING = 1000;
export const NEW_SKILL: Skill = { rating: START_RATING, attempts: 0 };

export const RATING_FLOOR = 400;
export const RATING_CEILING = 2000;
const K_START = 80;
const K_FLOOR = 24;
const K_DECAY = 0.05;
const DAILY_DECAY = 0.95;
const MAX_DECAY_DAYS = 30;
const STEP_RATING = 100;

/** Above this lead over the level the numbers get bigger; this far behind they get smaller. */
const TOUGH_LEAD = 200;
const GENTLE_LAG = 50;
const LOSSES_BEFORE_GENTLE = 2;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const expected = (rating: number, difficulty: number) => 1 / (1 + 10 ** ((difficulty - rating) / 400));

/** New players move fast so the game finds their level in a few answers, then settle. */
const kFactor = (attempts: number) => Math.max(K_FLOOR, K_START * Math.exp(-K_DECAY * attempts));

/** `score` is 1 for a clean success, 0 for a failure, and in between for partial ones. */
export const rate = (skill: Skill, difficulty: number, score: number): Skill => ({
  rating: clamp(
    skill.rating + kFactor(skill.attempts) * (score - expected(skill.rating, difficulty)),
    RATING_FLOOR,
    RATING_CEILING,
  ),
  attempts: skill.attempts + 1,
});

/** Time away pulls a rating back toward the start, so a returning player is eased in. */
export const decay = (skill: Skill, days: number): Skill => ({
  ...skill,
  rating: START_RATING + (skill.rating - START_RATING) * DAILY_DECAY ** clamp(days, 0, MAX_DECAY_DAYS),
});

const baseDifficulty = (level: Level) => 900 + STEP_RATING * level.step;

/** Rated against the numbers actually played, so a tougher tier counts as a tougher question. */
export const battleDifficulty = (level: Level, tier: Tier) => baseDifficulty(level) + STEP_RATING * TIER_STEP[tier];

export type CastResult = { exact: boolean; nearMiss: boolean; hinted: boolean };

/**
 * How a cast went, for the skill rating. Only casts that could have been exact with the tiles
 * left are rated, so spending leftover tiles on a long shot is never held against the player.
 */
export const castResult = (state: BattleState): CastResult | null => {
  const target = aimTarget(state);
  const total = equationTotal(state);
  if (target === null || total === null || state.equation.tiles.length < 2) return null;
  const values = state.hand.map((tile) => tile.value);
  const spentEarlier = state.hand.flatMap((tile, index) =>
    tile.used && !state.equation.tiles.includes(tile.id) ? [index] : [],
  );
  if (!solve(values, state.level.ops, target, { exclude: spentEarlier })) return null;
  const distance = Math.abs(total - target);
  return { exact: distance === 0, nearMiss: distance === 1, hinted: state.hintPath !== null };
};

export const castScore = ({ exact, nearMiss, hinted }: CastResult): number => {
  if (exact) return hinted ? 0.5 : 1;
  return nearMiss ? 0.4 : 0;
};

export const chooseTier = (skill: Skill, level: Level, lossesInARow: number): Tier => {
  if (lossesInARow >= LOSSES_BEFORE_GENTLE) return "gentle";
  const lead = skill.rating - baseDifficulty(level);
  if (lead >= TOUGH_LEAD) return "tough";
  return lead <= -GENTLE_LAG ? "gentle" : "standard";
};
