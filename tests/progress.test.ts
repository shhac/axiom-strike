import { describe, expect, it } from "vitest";
import { PASSAGES } from "../src/content/passages";
import { introFor } from "../src/content/intros";
import { answersFor, finishReading, pickPassage, readingGrade, rewardFor, wasRead } from "../src/engine/campfire";
import { findLevel, LEVELS, tuneLevel } from "../src/engine/levels";
import {
  changeSettings,
  EMPTY_SAVE,
  isUnlocked,
  kitFor,
  markSeen,
  parseSave,
  recordCast,
  recordLoss,
  recordWin,
  resetProgress,
  spendItems,
  startDay,
  starsFor,
  tierFor,
  type Save,
} from "../src/engine/progress";
import { createRng } from "../src/engine/rng";
import { battleDifficulty, castScore, chooseTier, decay, NEW_SKILL, rate, type Skill } from "../src/engine/skill";

const [add1, add2, add3, add5] = [findLevel("add_1"), findLevel("add_2"), findLevel("add_3"), findLevel("add_5")];

describe("saved progress", () => {
  it("opens the first level of every land, and the rest in order", () => {
    expect(LEVELS.filter((level) => isUnlocked(EMPTY_SAVE, level)).map((level) => level.id)).toEqual([
      "add_1",
      "sub_1",
      "mul_1",
      "div_1",
    ]);
    const afterWin = recordWin(EMPTY_SAVE, add1, 1);
    expect(isUnlocked(afterWin, add2)).toBe(true);
    expect(isUnlocked(afterWin, add3)).toBe(false);
  });

  it("never lowers stars on a replay, and each win lights the campfire up to three stories", () => {
    const twice = recordWin(recordWin(EMPTY_SAVE, add1, 3), add1, 1);
    expect(starsFor(twice, add1)).toBe(3);
    expect(twice.stories).toBe(2);
    expect([1, 2, 3, 4].reduce((save) => recordWin(save, add1, 2), EMPTY_SAVE).stories).toBe(3);
  });

  it("counts losses in a row and clears them on a win", () => {
    const lostTwice = recordLoss(recordLoss(EMPTY_SAVE, add1), add1);
    expect(lostTwice.losses).toEqual({ add_1: 2 });
    expect(recordWin(lostTwice, add1, 1).losses).toEqual({});
  });

  it("survives a round trip through storage", () => {
    const played: Save = {
      ...recordWin(recordLoss(EMPTY_SAVE, add2), add1, 2),
      potions: 3,
      scrolls: 1,
      read: [4, 9],
      seen: ["add"],
      lastPlayedDay: 20000,
      settings: { music: false, sound: true, difficulty: "tough", reading: "easy" },
    };
    expect(parseSave(JSON.stringify(played))).toEqual(played);
  });

  it("keeps the stars from a save written before items and settings existed", () => {
    const old = parseSave(JSON.stringify({ stars: { add_1: 3, add_2: 7, sub_1: "2" } }));
    expect(old).toEqual({ ...EMPTY_SAVE, stars: { add_1: 3 } });
  });

  it("falls back to a fresh save for anything unreadable", () => {
    expect([null, "", "nonsense", "[1,2]", "42"].map(parseSave)).toEqual(Array(5).fill(EMPTY_SAVE));
    expect(parseSave(JSON.stringify({ potions: 99, stories: -4, settings: { difficulty: "brutal" } }))).toMatchObject({
      potions: 9,
      stories: 0,
      settings: { difficulty: "auto", music: true },
    });
  });

  it("starting over wipes progress but keeps the settings", () => {
    const tuned = changeSettings(recordWin(EMPTY_SAVE, add1, 3), { music: false });
    expect(resetProgress(tuned)).toEqual({ ...EMPTY_SAVE, settings: tuned.settings });
  });

  it("remembers which intro scenes were shown", () => {
    expect(introFor(add1, [])?.id).toBe("add");
    const seen = markSeen(markSeen(EMPTY_SAVE, "add"), "add").seen;
    expect(seen).toEqual(["add"]);
    expect(introFor(add1, seen)).toBeNull();
    expect(introFor(add5, seen)?.id).toBe("add_boss");
    expect(introFor(add5, [...seen, "add_boss"])).toBeNull();
  });
});

describe("items", () => {
  const stocked: Save = { ...EMPTY_SAVE, potions: 5, scrolls: 2 };

  it("takes every carried scroll but only two potions into a battle", () => {
    expect(kitFor(stocked)).toEqual({ scrolls: 2, potions: 2 });
  });

  it("spends the three free hints before any carried scroll", () => {
    // A battle starts with 3 free + 2 carried = 5 hints.
    expect(spendItems(stocked, 4, 0).scrolls).toBe(2);
    expect(spendItems(stocked, 2, 0).scrolls).toBe(2);
    expect(spendItems(stocked, 1, 0).scrolls).toBe(1);
    expect(spendItems(stocked, 0, 0).scrolls).toBe(0);
  });

  it("takes each potion drunk out of the bag", () => {
    expect(spendItems(stocked, 5, 1).potions).toBe(4);
    expect(spendItems({ ...stocked, potions: 0 }, 5, 1).potions).toBe(0);
  });
});

describe("skill rating", () => {
  const afterCasts = (score: (cast: number) => number, casts: number, difficulty = 900): Skill =>
    Array.from({ length: casts }, (_, cast) => cast).reduce(
      (skill, cast) => rate(skill, difficulty, score(cast)),
      NEW_SKILL,
    );

  it("scores a clean exact answer above a hinted one, a near miss, and a miss", () => {
    const score = (exact: boolean, nearMiss: boolean, hinted: boolean) => castScore({ exact, nearMiss, hinted });
    expect([
      score(true, false, false),
      score(true, false, true),
      score(false, true, false),
      score(false, false, false),
    ]).toEqual([1, 0.5, 0.4, 0]);
  });

  it("moves a strong player up to tougher numbers within one level", () => {
    const strong = afterCasts(() => 1, 15);
    expect(chooseTier(strong, add1, 0)).toBe("tough");
    expect(chooseTier(strong, add2, 0)).toBe("tough");
  });

  it("moves a struggling player down to gentler numbers within one level", () => {
    const struggling = afterCasts((cast) => (cast % 3 === 0 ? 1 : 0), 15);
    expect(chooseTier(struggling, add1, 0)).toBe("gentle");
  });

  it("leaves a player who gets about two in three right on the standard numbers", () => {
    const steady = afterCasts((cast) => (cast % 3 === 2 ? 0 : 1), 30);
    expect(chooseTier(steady, add1, 0)).toBe("standard");
  });

  it("goes gentle after two losses in a row whatever the rating", () => {
    expect(chooseTier({ rating: 1900, attempts: 50 }, add1, 2)).toBe("gentle");
    expect(chooseTier({ rating: 1000, attempts: 50 }, add1, 1)).toBe("standard");
  });

  it("rates against the numbers actually played", () => {
    expect([
      battleDifficulty(add2, "gentle"),
      battleDifficulty(add2, "standard"),
      battleDifficulty(add2, "tough"),
    ]).toEqual([900, 1000, 1100]);
  });

  it("stays between 400 and 2000", () => {
    expect(afterCasts(() => 1, 400, 2400).rating).toBeLessThanOrEqual(2000);
    expect(afterCasts(() => 0, 400, 100).rating).toBeGreaterThanOrEqual(400);
  });

  it("drifts back toward the start with time away, from above and below, for at most thirty days", () => {
    expect(decay({ rating: 1400, attempts: 9 }, 1).rating).toBeCloseTo(1380);
    expect(decay({ rating: 600, attempts: 9 }, 1).rating).toBeCloseTo(620);
    expect(decay({ rating: 1400, attempts: 9 }, 400)).toEqual(decay({ rating: 1400, attempts: 9 }, 30));
    expect(decay({ rating: 1400, attempts: 9 }, -3).rating).toBe(1400);
  });

  it("applies the decay once when the game opens on a later day", () => {
    const rated = { ...recordCast(EMPTY_SAVE, "add", 900, 1), lastPlayedDay: 100 };
    expect(startDay(rated, 100)).toEqual(rated);
    const later = startDay(rated, 103);
    expect(later.lastPlayedDay).toBe(103);
    expect(later.skill.add.rating).toBeLessThan(rated.skill.add.rating);
    expect(later.skill.sub).toEqual(NEW_SKILL);
    expect(startDay(EMPTY_SAVE, 103)).toEqual({ ...EMPTY_SAVE, lastPlayedDay: 103 });
  });

  it("lets the player's own setting override the automatic choice", () => {
    expect(tierFor(changeSettings(EMPTY_SAVE, { difficulty: "tough" }), add1)).toBe("tough");
    expect(tierFor(recordLoss(recordLoss(EMPTY_SAVE, add1), add1), add1)).toBe("gentle");
    expect(tierFor(EMPTY_SAVE, add1)).toBe("standard");
  });

  it("changes every level's numbers in both directions, and nothing else", () => {
    const mean = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
    LEVELS.forEach((level) => {
      const [gentle, tough] = [tuneLevel(level, "gentle"), tuneLevel(level, "tough")];
      expect(gentle.tileMax).toBeLessThanOrEqual(level.tileMax);
      expect(mean(gentle.attack)).toBeLessThan(mean(level.attack));
      expect(mean(tough.attack)).toBeGreaterThan(mean(level.attack));
      expect([gentle.id, gentle.waves, gentle.ops]).toEqual([level.id, level.waves, level.ops]);
      expect(tuneLevel(level, "standard")).toBe(level);
    });
  });
});

describe("campfire", () => {
  const ready: Save = { ...EMPTY_SAVE, stories: 2 };
  const passage = PASSAGES[0]!;
  const longRead = 60_000;

  it("has fifty passages, each with one right, one nearly right and three other answers", () => {
    expect(PASSAGES).toHaveLength(50);
    PASSAGES.forEach((entry) => {
      const answers = answersFor(entry, createRng(3));
      expect(answers.map((answer) => answer.kind).sort()).toEqual(["almost", "correct", "other", "other", "other"]);
      expect(new Set(answers.map((answer) => answer.text)).size).toBe(5);
    });
  });

  it("rewards the right answer most, a near answer some, and an honest read a little", () => {
    expect(rewardFor("correct", true)).toEqual({ potions: 1, scrolls: 1 });
    expect(rewardFor("almost", true)).toEqual({ potions: 1, scrolls: 0 });
    expect(rewardFor("other", true)).toEqual({ potions: 0, scrolls: 1 });
    expect(rewardFor("other", false)).toEqual({ potions: 0, scrolls: 0 });
  });

  it("only counts a passage as read after a quarter of a second per word", () => {
    const words = passage.text.split(/\s+/).length;
    expect(wasRead(passage, words * 250)).toBe(true);
    expect(wasRead(passage, words * 250 - 1)).toBe(false);
  });

  it("uses up a story, hands over the reward and remembers the passage, all at once", () => {
    const after = finishReading(ready, 0, "correct", longRead);
    expect(after).toMatchObject({ stories: 1, potions: 1, scrolls: 1, read: [0] });
    expect(after.reading.attempts).toBe(1);
  });

  it("gives nothing when no story is waiting, and never more than nine of an item", () => {
    expect(finishReading(EMPTY_SAVE, 0, "correct", longRead)).toBe(EMPTY_SAVE);
    expect(finishReading({ ...ready, potions: 9, scrolls: 9 }, 0, "correct", longRead)).toMatchObject({
      potions: 9,
      scrolls: 9,
    });
  });

  it("does not repeat a passage until every one has been read", () => {
    const allButOne: Save = { ...ready, read: PASSAGES.map((_, id) => id).filter((id) => id !== 17) };
    expect(pickPassage(allButOne, createRng(1))).toBe(17);
    expect(finishReading(allButOne, 17, "other", longRead).read).toEqual([]);
  });

  it("starts readers a little below their maths, then follows how the reading goes", () => {
    expect(readingGrade(EMPTY_SAVE)).toBe(1.5);
    expect(readingGrade(recordWin(EMPTY_SAVE, findLevel("mul_1"), 1))).toBe(3);
    const strongReader: Save = { ...EMPTY_SAVE, reading: { rating: 1600, attempts: 3 } };
    expect(readingGrade(strongReader)).toBe(5);
    expect(readingGrade(changeSettings(strongReader, { reading: "easy" }))).toBe(1.5);
  });

  it("picks a passage at the reader's grade", () => {
    const grades = (save: Save) =>
      Array.from({ length: 20 }, (_, seed) => PASSAGES[pickPassage(save, createRng(seed + 1))]!.grade);
    expect(new Set(grades(changeSettings(EMPTY_SAVE, { reading: "easy" })))).toEqual(new Set([1, 2]));
    expect(new Set(grades(changeSettings(EMPTY_SAVE, { reading: "hard" })))).toEqual(new Set([5, 6]));
  });
});
