import { PASSAGES, type Passage } from "../content/passages";
import { REGIONS } from "./levels";
import { MAX_ITEMS, type ReadingLevel, type Save } from "./progress";
import type { Rng } from "./rng";
import { rate } from "./skill";

export type AnswerKind = "correct" | "almost" | "other";
export type Answer = { text: string; kind: AnswerKind };

export type Reward = { potions: number; scrolls: number };

const MIN_GRADE = 1;
const MAX_GRADE = 7;
/** Reading follows its own rating once there are this many answers to go on. */
const READINGS_BEFORE_OWN_RATING = 3;
/** A grade trails the maths a little, so a child strong at sums is not handed hard text. */
const READING_TRAILS_MATHS = 0.5;
const FIXED_GRADE: Record<Exclude<ReadingLevel, "auto">, number> = { easy: 1.5, medium: 3.5, hard: 5.5 };
/** Roughly the grade at which each land's sums are taught. */
const LAND_GRADE = [2, 2.5, 3.5, 4.5] as const;
/** Anything quicker than this per word was not read, only tapped through. */
const MIN_MS_PER_WORD = 250;

const SCORE: Record<AnswerKind, number> = { correct: 1, almost: 0.5, other: 0 };

const clampGrade = (grade: number) => Math.min(MAX_GRADE, Math.max(MIN_GRADE, grade));

const passageDifficulty = (grade: number) => 600 + 200 * grade;
const gradeForRating = (rating: number) => (rating - 600) / 200;

const mathsGrade = (save: Save): number => {
  const grades = REGIONS.flatMap((region, index) =>
    Object.keys(save.stars).some((levelId) => levelId.startsWith(`${region.id}_`)) ? [LAND_GRADE[index] ?? 0] : [],
  );
  return Math.max(LAND_GRADE[0], ...grades);
};

export const readingGrade = (save: Save): number => {
  const { reading } = save.settings;
  if (reading !== "auto") return FIXED_GRADE[reading];
  if (save.reading.attempts >= READINGS_BEFORE_OWN_RATING) return clampGrade(gradeForRating(save.reading.rating));
  return clampGrade(mathsGrade(save) - READING_TRAILS_MATHS);
};

/** An unread passage as close to the reader's grade as there is; once all are read they come round again. */
export const pickPassage = (save: Save, rng: Rng): number => {
  const all = PASSAGES.map((_, id) => id);
  const unread = all.filter((id) => !save.read.includes(id));
  const pool = unread.length > 0 ? unread : all;
  const grade = readingGrade(save);
  const distance = (id: number) => Math.abs((PASSAGES[id]?.grade ?? grade) - grade);
  const nearest = Math.min(...pool.map(distance));
  return rng.pick(pool.filter((id) => distance(id) === nearest));
};

export const answersFor = (passage: Passage, rng: Rng): Answer[] =>
  rng.shuffle([
    { text: passage.correct, kind: "correct" },
    { text: passage.almostRight, kind: "almost" },
    ...passage.others.map((text): Answer => ({ text, kind: "other" })),
  ]);

const wordCount = (text: string) => text.trim().split(/\s+/).length;

export const wasRead = (passage: Passage, readMs: number) => readMs >= wordCount(passage.text) * MIN_MS_PER_WORD;

/** The best answer earns the most, a near answer some, and any honest read at least a little. */
export const rewardFor = (kind: AnswerKind, read: boolean): Reward => {
  if (kind === "correct") return { potions: 1, scrolls: 1 };
  if (kind === "almost") return { potions: 1, scrolls: 0 };
  return { potions: 0, scrolls: read ? 1 : 0 };
};

/** Uses up one waiting story, hands over its reward and moves the reading rating. */
export const finishReading = (save: Save, passageId: number, kind: AnswerKind, readMs: number): Save => {
  const passage = PASSAGES[passageId];
  if (!passage || save.stories <= 0) return save;
  const reward = rewardFor(kind, wasRead(passage, readMs));
  const everyPassageRead = save.read.length + 1 >= PASSAGES.length;
  return {
    ...save,
    stories: save.stories - 1,
    potions: Math.min(MAX_ITEMS, save.potions + reward.potions),
    scrolls: Math.min(MAX_ITEMS, save.scrolls + reward.scrolls),
    read: everyPassageRead ? [] : [...save.read, passageId],
    reading: rate(save.reading, passageDifficulty(passage.grade), SCORE[kind]),
  };
};
