import { describe, expect, it } from "vitest";
import { findLevel } from "../src/engine/levels";
import { EMPTY_SAVE, recordLoss, recordWin, type Save } from "../src/engine/progress";
import { parseSave } from "../src/engine/saveParser";
import { NEW_SKILL } from "../src/engine/skill";

const [add1, add2] = [findLevel("add_1"), findLevel("add_2")];

describe("reading a stored save", () => {
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

  it("keeps each kind of sum's rating, and the reading rating, apart through storage", () => {
    const rated: Save = {
      ...EMPTY_SAVE,
      skill: {
        add: { rating: 1100, attempts: 1 },
        sub: { rating: 1200, attempts: 2 },
        mul: { rating: 1300, attempts: 3 },
        div: { rating: 1400, attempts: 4 },
      },
      reading: { rating: 1500, attempts: 5 },
    };
    expect(parseSave(JSON.stringify(rated))).toEqual(rated);
  });

  it("reads a stored rating as a whole number inside the rating range", () => {
    const stored = (rating: unknown, attempts: unknown) =>
      parseSave(JSON.stringify({ skill: { add: { rating, attempts } }, reading: "strong" }));
    expect(stored(1234.6, 7.2).skill.add).toEqual({ rating: 1235, attempts: 7 });
    expect(stored(5000, -3).skill.add).toEqual({ rating: 2000, attempts: 0 });
    expect(stored(-50, "many").skill.add).toEqual({ rating: 400, attempts: 0 });
    expect(stored("high", 2).skill.add).toEqual({ rating: 1000, attempts: 2 });
    expect(stored(1100, 1)).toMatchObject({ skill: { sub: NEW_SKILL, mul: NEW_SKILL, div: NEW_SKILL } });
    expect(stored(1100, 1).reading).toEqual(NEW_SKILL);
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
});
