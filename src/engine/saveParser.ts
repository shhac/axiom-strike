import { perLand, REGIONS, type LandId } from "./levels";
import {
  DEFAULT_SETTINGS,
  DIFFICULTIES,
  EMPTY_SAVE,
  MAX_ITEMS,
  MAX_STORIES,
  READING_LEVELS,
  type Save,
  type Settings,
} from "./progress";
import { NEW_SKILL, RATING_CEILING, RATING_FLOOR, type Skill } from "./skill";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const wholeNumber = (value: unknown, min: number, max: number, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;

const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  options.find((option) => option === value) ?? fallback;

const flag = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);

const counts = (value: unknown, min: number, max: number): Record<string, number> =>
  isRecord(value)
    ? Object.fromEntries(
        Object.entries(value).filter(
          (entry): entry is [string, number] => typeof entry[1] === "number" && entry[1] >= min && entry[1] <= max,
        ),
      )
    : {};

const skill = (value: unknown): Skill =>
  isRecord(value)
    ? {
        rating: wholeNumber(value.rating, RATING_FLOOR, RATING_CEILING, NEW_SKILL.rating),
        attempts: wholeNumber(value.attempts, 0, 1e6, 0),
      }
    : NEW_SKILL;

const list = <T>(value: unknown, keep: (item: unknown) => item is T): T[] =>
  Array.isArray(value) ? value.filter(keep) : [];

const isString = (item: unknown): item is string => typeof item === "string";
const isIndex = (item: unknown): item is number => typeof item === "number" && Number.isInteger(item) && item >= 0;

const settings = (value: unknown): Settings => {
  if (!isRecord(value)) return DEFAULT_SETTINGS;
  return {
    music: flag(value.music, true),
    sound: flag(value.sound, true),
    difficulty: oneOf(value.difficulty, DIFFICULTIES, "auto"),
    reading: oneOf(value.reading, READING_LEVELS, "auto"),
  };
};

/** How many of a land's chests must be open for its tile style and its pet to have been won. */
const STYLE_CHEST = 1;
const PET_CHEST = 3;

const land = (value: unknown): LandId | null => REGIONS.find((region) => region.id === value)?.id ?? null;

const dayNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const streak = (value: unknown): Save["streak"] =>
  isRecord(value) ? { days: wholeNumber(value.days, 0, 1e5, 0), lastDay: dayNumber(value.lastDay) } : EMPTY_SAVE.streak;

const daily = (value: unknown): Save["daily"] =>
  isRecord(value)
    ? { day: dayNumber(value.day), practice: flag(value.practice, false), words: flag(value.words, false) }
    : EMPTY_SAVE.daily;

const parseJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

/** Anything missing or malformed falls back to a fresh value, so an older save keeps its stars. */
export const parseSave = (raw: string | null): Save => {
  if (!raw) return EMPTY_SAVE;
  const parsed = parseJson(raw);
  if (!isRecord(parsed)) return EMPTY_SAVE;
  const skills = isRecord(parsed.skill) ? parsed.skill : {};
  const chests = perLand((id) => wholeNumber(isRecord(parsed.chests) ? parsed.chests[id] : 0, 0, 3, 0));
  // Only what its chest has given can be worn, whatever the stored save claims.
  const worn = (value: unknown, opened: number) => {
    const id = land(value);
    return id && chests[id] >= opened ? id : null;
  };
  return {
    stars: counts(parsed.stars, 1, 3),
    skill: perLand((land) => skill(skills[land])),
    reading: skill(parsed.reading),
    lastPlayedDay: typeof parsed.lastPlayedDay === "number" ? parsed.lastPlayedDay : null,
    losses: counts(parsed.losses, 1, 1e6),
    potions: wholeNumber(parsed.potions, 0, MAX_ITEMS, 0),
    scrolls: wholeNumber(parsed.scrolls, 0, MAX_ITEMS, 0),
    stories: wholeNumber(parsed.stories, 0, MAX_STORIES, 0),
    read: list(parsed.read, isIndex),
    heroAt: typeof parsed.heroAt === "string" ? parsed.heroAt : null,
    chests,
    pet: worn(parsed.pet, PET_CHEST),
    tileStyle: worn(parsed.tileStyle, STYLE_CHEST),
    beaten: counts(parsed.beaten, 1, 1e6),
    streak: streak(parsed.streak),
    daily: daily(parsed.daily),
    practiceBest: wholeNumber(parsed.practiceBest, 0, 1e4, 0),
    seen: list(parsed.seen, isString),
    settings: settings(parsed.settings),
  };
};
