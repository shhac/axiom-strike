import { LEVELS, type Level } from "./levels";

export type Save = { stars: Record<string, number> };

export const EMPTY_SAVE: Save = { stars: {} };

export const starsFor = (save: Save, level: Level) => save.stars[level.id] ?? 0;

/** Any land can be started; inside a land each level opens when the one before it is beaten. */
export const isUnlocked = (save: Save, level: Level): boolean => {
  if (level.step === 0) return true;
  const previous = LEVELS.find((candidate) => candidate.region === level.region && candidate.step === level.step - 1);
  return previous !== undefined && starsFor(save, previous) > 0;
};

/** Replaying a level never lowers its stars. */
export const recordWin = (save: Save, level: Level, stars: number): Save => ({
  ...save,
  stars: { ...save.stars, [level.id]: Math.max(starsFor(save, level), stars) },
});

export const parseSave = (raw: string | null): Save => {
  if (!raw) return EMPTY_SAVE;
  try {
    const parsed: unknown = JSON.parse(raw);
    const stars = typeof parsed === "object" && parsed !== null && "stars" in parsed ? parsed.stars : null;
    if (typeof stars !== "object" || stars === null) return EMPTY_SAVE;
    const clean = Object.entries(stars).filter(
      (entry): entry is [string, number] => typeof entry[1] === "number" && entry[1] >= 1 && entry[1] <= 3,
    );
    return { stars: Object.fromEntries(clean) };
  } catch {
    return EMPTY_SAVE;
  }
};
