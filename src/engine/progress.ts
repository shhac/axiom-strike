import type { Kit } from "./battle";
import { LEVELS, perFamily, TIERS, type Level, type OpFamily, type Tier } from "./levels";
import { chooseTier, decay, NEW_SKILL, rate, type Skill } from "./skill";

export const DIFFICULTIES = ["auto", ...TIERS] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const READING_LEVELS = ["auto", "easy", "medium", "hard"] as const;
export type ReadingLevel = (typeof READING_LEVELS)[number];

export type Settings = { music: boolean; sound: boolean; difficulty: Difficulty; reading: ReadingLevel };

export type Save = {
  stars: Record<string, number>;
  skill: Record<OpFamily, Skill>;
  reading: Skill;
  /** Whole days since 1970, so time away can ease a returning player back in. */
  lastPlayedDay: number | null;
  /** Losses in a row on each level, cleared by a win. */
  losses: Record<string, number>;
  potions: number;
  scrolls: number;
  /** Campfire stories waiting to be read; each level win adds one. */
  stories: number;
  /** Passages already read, so stories do not repeat until all have been seen. */
  read: readonly number[];
  /** Intro scenes already shown. */
  seen: readonly string[];
  settings: Settings;
};

export const MAX_ITEMS = 9;
export const MAX_STORIES = 3;
export const POTIONS_PER_BATTLE = 2;

export const DEFAULT_SETTINGS: Settings = { music: true, sound: true, difficulty: "auto", reading: "auto" };

export const EMPTY_SAVE: Save = {
  stars: {},
  skill: perFamily(() => NEW_SKILL),
  reading: NEW_SKILL,
  lastPlayedDay: null,
  losses: {},
  potions: 0,
  scrolls: 0,
  stories: 0,
  read: [],
  seen: [],
  settings: DEFAULT_SETTINGS,
};

export const starsFor = (save: Save, level: Level) => save.stars[level.id] ?? 0;

/** Any land can be started; inside a land each level opens when the one before it is beaten. */
export const isUnlocked = (save: Save, level: Level): boolean => {
  if (level.step === 0) return true;
  const previous = LEVELS.find((candidate) => candidate.region === level.region && candidate.step === level.step - 1);
  return previous !== undefined && starsFor(save, previous) > 0;
};

const withoutLosses = (losses: Record<string, number>, levelId: string): Record<string, number> =>
  Object.fromEntries(Object.entries(losses).filter(([id]) => id !== levelId));

/** Replaying a level never lowers its stars. Every win lights the campfire for one more story. */
export const recordWin = (save: Save, level: Level, stars: number): Save => ({
  ...save,
  stars: { ...save.stars, [level.id]: Math.max(starsFor(save, level), stars) },
  losses: withoutLosses(save.losses, level.id),
  stories: Math.min(MAX_STORIES, save.stories + 1),
});

export const recordLoss = (save: Save, level: Level): Save => ({
  ...save,
  losses: { ...save.losses, [level.id]: (save.losses[level.id] ?? 0) + 1 },
});

export const recordCast = (save: Save, family: OpFamily, difficulty: number, score: number): Save => ({
  ...save,
  skill: { ...save.skill, [family]: rate(save.skill[family], difficulty, score) },
});

/** The player's own setting wins; on auto the game picks from how they have been doing. */
export const tierFor = (save: Save, level: Level): Tier =>
  save.settings.difficulty === "auto"
    ? chooseTier(save.skill[level.region], level, save.losses[level.id] ?? 0)
    : save.settings.difficulty;

/** Only a couple of potions go into each battle, so a full bag cannot buy three stars. */
export const kitFor = (save: Save): Kit => ({
  scrolls: save.scrolls,
  potions: Math.min(POTIONS_PER_BATTLE, save.potions),
});

/**
 * What is left after items were used in a battle. Free hint scrolls are spent before carried
 * ones, so carried scrolls only go down once fewer hints remain than were carried in.
 */
export const spendItems = (save: Save, hintsLeft: number, potionsDrunk: number): Save => ({
  ...save,
  scrolls: Math.min(save.scrolls, hintsLeft),
  potions: Math.max(0, save.potions - potionsDrunk),
});

export const markSeen = (save: Save, id: string): Save =>
  save.seen.includes(id) ? save : { ...save, seen: [...save.seen, id] };

export const changeSettings = (save: Save, change: Partial<Settings>): Save => ({
  ...save,
  settings: { ...save.settings, ...change },
});

/** Wipes progress but keeps how the player likes the game set up. */
export const resetProgress = (save: Save): Save => ({ ...EMPTY_SAVE, settings: save.settings });

/** Called when the game opens: ratings drift back toward the start for each day away. */
export const startDay = (save: Save, today: number): Save => {
  const away = save.lastPlayedDay === null ? 0 : Math.max(0, today - save.lastPlayedDay);
  if (away === 0) return { ...save, lastPlayedDay: today };
  return {
    ...save,
    lastPlayedDay: today,
    reading: decay(save.reading, away),
    skill: perFamily((family) => decay(save.skill[family], away)),
  };
};
