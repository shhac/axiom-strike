import { filler, pairFor } from "./deal";
import { FIRST_LEVEL, levelAt, type LandId, type Level } from "./levels";
import { createRng, type Rng } from "./rng";
import { solve, type Solution } from "./solver";

export const CAVE_ROUNDS = 8;
const CAVE_TILES = 5;
const TRIES = 60;

/** One question in an "Impossible or not?" cave: can these tiles make the number? */
export type Riddle = { hand: number[]; target: number; answer: Solution | null };

/** A cave uses the numbers of its land's middle level. */
const CAVE_STEP = 2;

export const caveLevel = (land: LandId): Level => levelAt(land, CAVE_STEP) ?? FIRST_LEVEL;

export const caveId = (land: LandId) => `cave_${land}`;

/** Every tile may be used, so a child's long answer is never marked wrong. */
const answerFor = (level: Level, hand: readonly number[], target: number) =>
  solve(hand, level.ops, target, { maxTiles: CAVE_TILES, grain: level.grain });

/** A hand that hides an answer when one is wanted; otherwise a random one, which may or may not have one. */
const draw = (rng: Rng, level: Level, wanted: boolean): Riddle => {
  const target = rng.pick(level.weakness);
  const pair = wanted ? (pairFor(rng, level, target) ?? []) : [];
  const hand = rng.shuffle([...pair, ...filler(rng, level, CAVE_TILES - pair.length)]);
  return { hand, target, answer: answerFor(level, hand, target) };
};

/** Draws until the riddle is the kind asked for. In a land where almost anything can be made it settles for what it has. */
const riddle = (rng: Rng, level: Level, wanted: boolean): Riddle => {
  const tries = Array.from({ length: TRIES }, () => draw(rng, level, wanted));
  return tries.find((candidate) => (candidate.answer !== null) === wanted) ?? tries[0]!;
};

/** Eight riddles, about half of them possible, in an order the seed decides. */
export const caveRiddles = (level: Level, seed: number): Riddle[] => {
  const rng = createRng(seed);
  const wanted = rng.shuffle(Array.from({ length: CAVE_ROUNDS }, (_, index) => index % 2 === 0));
  return wanted.map((possible) => riddle(rng, level, possible));
};

export const isRight = ({ answer }: Riddle, saidPossible: boolean) => (answer !== null) === saidPossible;

export const caveStars = (right: number): number => {
  if (right >= CAVE_ROUNDS) return 3;
  if (right >= 6) return 2;
  return right >= 4 ? 1 : 0;
};
