import { describe, expect, it } from "vitest";
import { introFor } from "../src/content/intros";
import { findLevel, LEVELS } from "../src/engine/levels";
import {
  changeSettings,
  EMPTY_SAVE,
  isUnlocked,
  kitFor,
  markSeen,
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
import { decay, NEW_SKILL } from "../src/engine/skill";

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

describe("ratings in the save", () => {
  it("applies the decay once when the game opens on a later day", () => {
    const rated = { ...recordCast(EMPTY_SAVE, "add", 900, 1), lastPlayedDay: 100 };
    expect(startDay(rated, 100)).toEqual(rated);
    const later = startDay(rated, 103);
    expect(later.lastPlayedDay).toBe(103);
    expect(later.skill.add.rating).toBeLessThan(rated.skill.add.rating);
    expect(later.skill.sub).toEqual(NEW_SKILL);
    expect(startDay(EMPTY_SAVE, 103)).toEqual({ ...EMPTY_SAVE, lastPlayedDay: 103 });
  });

  it("decays every kind of sum and the reading rating by the same days away", () => {
    const rated: Save = {
      ...EMPTY_SAVE,
      lastPlayedDay: 100,
      skill: {
        add: { rating: 1100, attempts: 1 },
        sub: { rating: 1200, attempts: 2 },
        mul: { rating: 1300, attempts: 3 },
        div: { rating: 1400, attempts: 4 },
      },
      reading: { rating: 1500, attempts: 5 },
    };
    const later = startDay(rated, 104);
    expect(later.skill).toEqual({
      add: decay(rated.skill.add, 4),
      sub: decay(rated.skill.sub, 4),
      mul: decay(rated.skill.mul, 4),
      div: decay(rated.skill.div, 4),
    });
    expect(later.reading).toEqual(decay(rated.reading, 4));
    expect(startDay(rated, 90)).toEqual({ ...rated, lastPlayedDay: 90 });
  });

  it("lets the player's own setting override the automatic choice", () => {
    expect(tierFor(changeSettings(EMPTY_SAVE, { difficulty: "tough" }), add1)).toBe("tough");
    expect(tierFor(recordLoss(recordLoss(EMPTY_SAVE, add1), add1), add1)).toBe("gentle");
    expect(tierFor(EMPTY_SAVE, add1)).toBe("standard");
  });
});
