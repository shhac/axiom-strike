import { describe, expect, it } from "vitest";
import type { BattleState } from "../src/engine/battle";
import { findLevel } from "../src/engine/levels";
import {
  battleDifficulty,
  castResult,
  castScore,
  chooseTier,
  decay,
  NEW_SKILL,
  rate,
  type Skill,
} from "../src/engine/skill";
import { applyActions, openingState } from "./bots";

const [add1, add2] = [findLevel("add_1"), findLevel("add_2")];

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
});

describe("rating a cast", () => {
  const strikeAt = (values: number[], used: number[] = []): BattleState => {
    const opening = openingState(add1, 7);
    const [first, ...others] = opening.enemies;
    const rigged: BattleState = {
      ...opening,
      hand: values.map((value, index) => ({ id: 100 + index, value, used: used.includes(index) })),
      enemies: first ? [{ ...first, weakness: 7 }, ...others] : [],
    };
    return applyActions(rigged, [{ type: "aim", aim: { enemyId: first?.id ?? 0, kind: "strike" } }]);
  };
  const tap = (state: BattleState, ...tiles: number[]) =>
    applyActions(
      state,
      tiles.map((index) => ({ type: "tapTile", tileId: 100 + index })),
    );

  it("tells an exact answer from one that is off by one and one that is further out", () => {
    const aimed = strikeAt([3, 4, 5, 9]);
    expect(castResult(tap(aimed, 0, 1))).toEqual({ exact: true, nearMiss: false, hinted: false });
    expect(castResult(tap(aimed, 0, 2))).toEqual({ exact: false, nearMiss: true, hinted: false });
    expect(castResult(tap(aimed, 2, 3))).toEqual({ exact: false, nearMiss: false, hinted: false });
  });

  it("marks an answer that followed a hint", () => {
    const hinted: BattleState = { ...tap(strikeAt([3, 4, 5, 9]), 0, 1), hintPath: { tiles: [100, 101], ops: ["+"] } };
    expect(castResult(hinted)).toEqual({ exact: true, nearMiss: false, hinted: true });
  });

  it("leaves out a cast with no aim or fewer than two tiles", () => {
    const aimed = strikeAt([3, 4, 5, 9]);
    expect(castResult(tap(aimed, 0))).toBeNull();
    expect(castResult({ ...tap(aimed, 0, 1), aim: null })).toBeNull();
  });

  it("leaves out a cast when no exact answer was left in the hand", () => {
    expect(castResult(tap(strikeAt([1, 1, 1, 1]), 0, 1))).toBeNull();
    expect(castResult(tap(strikeAt([3, 4, 5, 9], [0, 1]), 2, 3))).toBeNull();
  });
});
