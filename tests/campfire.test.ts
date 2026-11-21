import { describe, expect, it } from "vitest";
import { PASSAGES } from "../src/content/passages";
import { answersFor, finishReading, pickPassage, readingGrade, rewardFor, wasRead } from "../src/engine/campfire";
import { findLevel } from "../src/engine/levels";
import { changeSettings, EMPTY_SAVE, recordWin, type Save } from "../src/engine/progress";
import { createRng } from "../src/engine/rng";

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
