import type { Kit } from "./battle";
import {
  findRegion,
  levelAt,
  LEVELS,
  perLand,
  TIERS,
  type EnemyKind,
  type LandId,
  type Level,
  type OpFamily,
  type Tier,
} from "./levels";
import { chooseTier, decay, NEW_SKILL, rate, type Skill } from "./skill";
import { learn, NEW_WORD_LAB, type WordAnswer, type WordLab } from "./words";

export const DIFFICULTIES = ["auto", ...TIERS] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const READING_LEVELS = ["auto", "easy", "medium", "hard"] as const;
export type ReadingLevel = (typeof READING_LEVELS)[number];

export type Settings = { music: boolean; sound: boolean; difficulty: Difficulty; reading: ReadingLevel };

export type Save = {
  stars: Record<string, number>;
  skill: Record<LandId, Skill>;
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
  /** The level the hero stands beside on the map: the last one entered or walked to. */
  heroAt: string | null;
  /** How many of each land's three star chests have been opened. */
  chests: Record<LandId, number>;
  /** The pet and tile style in use, named by the land whose chest gave them. */
  pet: LandId | null;
  tileStyle: LandId | null;
  /** How many of each monster have been beaten, for the monster book. */
  beaten: Record<string, number>;
  /** Days played in a row. A missed day halves it instead of wiping it. */
  streak: { days: number; lastDay: number | null };
  /** Which once-a-day camp prizes have been won on `day`. */
  daily: { day: number | null; practice: boolean; words: boolean };
  practiceBest: number;
  /** Which word parts the child has met and how well each is known, so shaky ones come back sooner. */
  wordLab: WordLab;
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
  skill: perLand(() => NEW_SKILL),
  reading: NEW_SKILL,
  lastPlayedDay: null,
  losses: {},
  potions: 0,
  scrolls: 0,
  stories: 0,
  read: [],
  heroAt: null,
  chests: perLand(() => 0),
  pet: null,
  tileStyle: null,
  beaten: {},
  streak: { days: 0, lastDay: null },
  daily: { day: null, practice: false, words: false },
  practiceBest: 0,
  wordLab: NEW_WORD_LAB,
  seen: [],
  settings: DEFAULT_SETTINGS,
};

export const starsFor = (save: Save, level: Level) => save.stars[level.id] ?? 0;

/** Stars across every level of every land. Caves and anything else kept beside them do not count. */
export const totalStars = (save: Save): number => LEVELS.reduce((sum, level) => sum + starsFor(save, level), 0);

export const landIsOpen = (save: Save, land: LandId): boolean => totalStars(save) >= findRegion(land).opensAt;

/**
 * Any of the first four lands can be started; the far lands open on stars in total. Inside a
 * land each level opens when the one before it is beaten.
 */
export const isUnlocked = (save: Save, level: Level): boolean => {
  if (!landIsOpen(save, level.region)) return false;
  if (level.step === 0) return true;
  const previous = levelAt(level.region, level.step - 1);
  return previous !== undefined && starsFor(save, previous) > 0;
};

export const standAt = (save: Save, level: Level): Save =>
  save.heroAt === level.id ? save : { ...save, heroAt: level.id };

/** Where the hero stands on the map; before anything has been played, at the very first level. */
export const heroSpot = (save: Save): Level | undefined =>
  LEVELS.find((level) => level.id === save.heroAt) ?? LEVELS[0];

/**
 * Where the hero should end up: once the level they stand at is beaten they move on to the next
 * one in that land if it has not been beaten yet, and otherwise stay put.
 */
export const heroGoal = (save: Save): Level | undefined => {
  const spot = heroSpot(save);
  if (!spot || starsFor(save, spot) === 0) return spot;
  const next = levelAt(spot.region, spot.step + 1);
  return next && starsFor(save, next) === 0 ? next : spot;
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

export const recordCast = (save: Save, family: LandId, difficulty: number, score: number): Save => ({
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
    skill: perLand((land) => decay(save.skill[land], away)),
  };
};

const gain = (count: number, more: number) => Math.min(MAX_ITEMS, count + more);

export const addPotion = (save: Save): Save => ({ ...save, potions: gain(save.potions, 1) });

/* ---------- Star chests ---------- */

/** Stars in a land that open its three chests, in order. */
export const GATES = [5, 10, 15] as const;

/** What each chest holds besides a potion and a scroll, in the order they are opened. */
export const CHEST_PRIZES = ["pet", "key", "style"] as const;
export type ChestPrize = (typeof CHEST_PRIZES)[number];

export const landStars = (save: Save, land: LandId): number =>
  LEVELS.filter((level) => level.region === land).reduce((sum, level) => sum + starsFor(save, level), 0);

/** The stars the next chest in a land needs, or null once all three are open. */
export const nextGate = (save: Save, land: LandId): number | null => GATES[save.chests[land]] ?? null;

export const chestReady = (save: Save, land: LandId): boolean => {
  const gate = nextGate(save, land);
  return gate !== null && landIsOpen(save, land) && landStars(save, land) >= gate;
};

export const ownsStyle = (save: Save, land: LandId) => save.chests[land] >= 3;
export const hasCaveKey = (save: Save, land: LandId) => save.chests[land] >= 2;
export const ownsPet = (save: Save, land: LandId) => save.chests[land] >= 1;

/** Opens a land's next chest. A new tile style or pet is put to use straight away. */
export const openChest = (save: Save, land: LandId): Save => {
  if (!chestReady(save, land)) return save;
  const prize = CHEST_PRIZES[save.chests[land]];
  return {
    ...save,
    chests: { ...save.chests, [land]: save.chests[land] + 1 },
    potions: gain(save.potions, 1),
    scrolls: gain(save.scrolls, 1),
    tileStyle: prize === "style" ? land : save.tileStyle,
    pet: prize === "pet" ? land : save.pet,
  };
};

/** What ends up worn: nothing asked keeps what is on, `null` takes it off, and a land's item goes on only if owned. */
const worn = (asked: LandId | null | undefined, current: LandId | null, owns: (land: LandId) => boolean) => {
  if (asked === undefined) return current;
  if (asked === null) return null;
  return owns(asked) ? asked : current;
};

/** Only what has been won can be worn; `null` is always allowed (no pet, classic tiles). */
export const wear = (save: Save, change: { pet?: LandId | null; tileStyle?: LandId | null }): Save => ({
  ...save,
  pet: worn(change.pet, save.pet, (land) => ownsPet(save, land)),
  tileStyle: worn(change.tileStyle, save.tileStyle, (land) => ownsStyle(save, land)),
});

/* ---------- Monster book ---------- */

export const LUCKY_KEY = "lucky";

/** The name a monster's page goes by in `beaten`. */
export const bookKey = (family: OpFamily, kind: EnemyKind) => `${family}_${kind}`;

export const recordBeaten = (save: Save, monster: string): Save => ({
  ...save,
  beaten: { ...save.beaten, [monster]: (save.beaten[monster] ?? 0) + 1 },
});

/* ---------- Playing each day ---------- */

const PRACTICE_PRIZE_SCORE = 3;
const WORDS_PRIZE_SCORE = 4;

/**
 * Marks `day` (a whole local day number) as played. The first time each day this moves the
 * streak, one more for a day in a row and half as many after a gap, and resets the daily prizes.
 */
export const markPlayed = (save: Save, day: number): Save => {
  const { days, lastDay } = save.streak;
  // A clock set back, or a flight west, must not halve the streak or pay the day's prizes twice.
  if (lastDay !== null && day <= lastDay) return save;
  const inARow = lastDay !== null && day - lastDay === 1;
  const kept = lastDay === null ? 1 : Math.max(1, Math.floor(days / 2));
  return {
    ...save,
    streak: { days: inARow ? days + 1 : kept, lastDay: day },
    daily: { day, practice: false, words: false },
  };
};

/** Whether one of the once-a-day camp prizes has already been won on `day`. */
export const prizeWon = (save: Save, prize: "practice" | "words", day: number): boolean =>
  save.daily.day === day && save.daily[prize];

/** Best score is kept; the first run of the day that scores well enough wins a potion. */
export const recordPractice = (save: Save, score: number, day: number): Save => {
  const played = markPlayed(save, day);
  const best = { ...played, practiceBest: Math.max(played.practiceBest, score) };
  if (played.daily.practice || score < PRACTICE_PRIZE_SCORE) return best;
  return { ...addPotion(best), daily: { ...played.daily, practice: true } };
};

/** Every run teaches the lab what the child knows; the first of the day with enough right wins a hint scroll. */
export const recordWords = (save: Save, answers: readonly WordAnswer[], day: number): Save => {
  const played = { ...markPlayed(save, day), wordLab: learn(save.wordLab, answers) };
  const right = answers.filter((answer) => answer.right).length;
  if (played.daily.words || right < WORDS_PRIZE_SCORE) return played;
  return { ...played, scrolls: gain(played.scrolls, 1), daily: { ...played.daily, words: true } };
};

/** A cave keeps its best stars beside the level stars. Its first clear gives a potion and a scroll. */
export const recordCave = (save: Save, caveKey: string, stars: number): Save => {
  const before = save.stars[caveKey] ?? 0;
  if (stars <= before) return save;
  const kept = { ...save, stars: { ...save.stars, [caveKey]: stars } };
  return before > 0 ? kept : { ...kept, potions: gain(kept.potions, 1), scrolls: gain(kept.scrolls, 1) };
};
