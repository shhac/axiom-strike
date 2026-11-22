import { describe, expect, it } from "vitest";
import { answerLeft, isLucky, reduce, type Action, type BattleState, type Enemy } from "../src/engine/battle";
import { canPair } from "../src/engine/deal";
import { findLevel, LEVELS, TIERS, tuneLevel } from "../src/engine/levels";
import { fractionLevels } from "./helpers";
import { applyActions, openingState, solverBot, winRate } from "./bots";

const act = (state: BattleState, ...actions: Action[]) => applyActions(state, actions);
const events = (state: BattleState, action: Action) => reduce(state, action).map((step) => step.event?.type ?? null);
const tap = (index: number): Action => ({ type: "tapTile", tileId: 100 + index });
const op = (sign: "+" | "-" | "×" | "÷"): Action => ({ type: "tapOp", op: sign });
const cast: Action = { type: "cast" };

/** The first level's opening wave with a chosen hand and a changed first monster. */
const rig = (values: number[], enemy: Partial<Enemy>, levelId = "add_1"): BattleState => {
  const state = openingState(findLevel(levelId), 7);
  return {
    ...state,
    hand: values.map((value, index) => ({ id: 100 + index, value, used: false })),
    enemies: state.enemies.map((e, index) => (index === 0 ? { ...e, ...enemy } : e)),
  };
};

const first = (state: BattleState) => state.enemies[0]!;

describe("helmet", () => {
  const helmeted = () => rig([3, 4, 2, 5, 1, 6, 2], { quirk: "helmet", weakness: 7, hp: 40, maxHp: 40 });

  it("takes two exact two-number hits to knock off, and stops their damage", () => {
    const dented = act(helmeted(), tap(0), tap(1), cast);
    expect(first(dented)).toMatchObject({ hp: 40, quirk: "helmet", dents: 1 });
    expect(first(dented).weakness).not.toBe(7);

    const again = { ...dented, enemies: dented.enemies.map((e, i) => (i === 0 ? { ...e, weakness: 7 } : e)) };
    const off = act(again, tap(2), tap(3), cast);
    expect(first(off)).toMatchObject({ hp: 40, quirk: null });
  });

  it("comes straight off for a three-number sum, which also does its damage", () => {
    const state = helmeted();
    const steps = reduce(act(state, tap(0), tap(2), tap(6)), cast);
    expect(steps[0]?.event).toMatchObject({ type: "strike", damage: 35, helmet: "off" });
    expect(first(steps.at(-1)!.state)).toMatchObject({ hp: 5, quirk: null });
  });

  it("shrugs off a near miss", () => {
    const state = act(helmeted(), tap(0), tap(3), cast);
    expect(first(state)).toMatchObject({ hp: 40, dents: 0, quirk: "helmet" });
  });

  it("is beaten faster by a child who uses longer sums", () => {
    const level = findLevel("add_3");
    expect(winRate(level, solverBot(4), 200).meanTurns).toBeLessThan(winRate(level, solverBot(2), 200).meanTurns);
  });
});

describe("a monster that hates plus", () => {
  const hater = () => rig([9, 3, 2, 4, 5, 1, 6], { quirk: "noPlus", weakness: 6 }, "sub_1");

  it("refuses the sign, and a sum that already has it, without spending tiles", () => {
    const state = hater();
    expect(events(act(state, tap(0)), op("+"))).toEqual(["rejected"]);
    // Built while aimed elsewhere, then turned on the hater.
    const other = state.enemies[1]!.id;
    const built = act(state, { type: "aim", aim: { enemyId: other, kind: "strike" } }, tap(2), op("+"), tap(3));
    const turned = act(built, { type: "aim", aim: { enemyId: first(state).id, kind: "strike" } });
    expect(events(turned, cast)).toEqual(["rejected"]);
    expect(act(turned, cast).hand.filter((tile) => tile.used)).toHaveLength(2);
  });

  it("is hurt by the land's other sign, which is applied without being picked", () => {
    const state = act(hater(), tap(0), tap(1), cast);
    expect(first(state).hp).toBe(first(hater()).hp - 20);
  });

  it("is never hinted at or judged with the sign it hates", () => {
    const stuck = rig([2, 4, 1, 1, 1, 1, 1], { quirk: "noPlus", weakness: 6 }, "sub_1");
    expect(answerLeft(stuck)).toBeNull();
    expect(events(stuck, { type: "impossible" })).toEqual(["sharpEye"]);
    expect(events(stuck, { type: "hint" })).toEqual(["rejected"]);
  });

  it("can block that monster's attack with any sign", () => {
    const state = rig(
      [2, 4, 1, 1, 1, 1, 1],
      { quirk: "noPlus", intent: { damage: 6, remaining: 6, turns: 1 } },
      "sub_1",
    );
    const blocked = act(
      state,
      { type: "aim", aim: { enemyId: first(state).id, kind: "parry" } },
      tap(0),
      op("+"),
      tap(1),
      cast,
    );
    expect(first(blocked).intent.turns).toBeGreaterThanOrEqual(2);
  });

  it("always has weaknesses two tiles can make without plus, on every level and tier with more than one sign", () => {
    const empty = LEVELS.filter((level) => level.ops.length > 1).flatMap((level) =>
      TIERS.flatMap((tier) => {
        const tuned = tuneLevel(level, tier);
        return tuned.weakness.some((value) => canPair(tuned, value, "+")) ? [] : [`${level.id} ${tier}`];
      }),
    );
    expect(empty).toEqual([]);
  });

  it("starts every turn against a hater with an answer that avoids plus", () => {
    const levels = LEVELS.filter((level) => level.waves[0]?.[0]?.quirk === "noPlus");
    expect(levels.length).toBeGreaterThan(0);
    const stuck = levels.flatMap((level) =>
      TIERS.flatMap((tier) =>
        Array.from({ length: 60 }, (_, seed) => openingState(tuneLevel(level, tier), seed + 1)).flatMap((state) =>
          answerLeft(state) ? [] : [`${level.id} ${tier} seed ${state.seed}`],
        ),
      ),
    );
    expect(stuck).toEqual([]);
  });
});

describe("boss phase", () => {
  it("gains its land's quirk once, the first time it is at half health", () => {
    const state = rig([3, 4, 2, 5, 1, 6, 2], { kind: "boss", hp: 60, maxHp: 100, weakness: 7 });
    const steps = reduce(act(state, tap(0), tap(1)), cast);
    expect(steps.map((step) => step.event?.type)).toEqual(["strike", "bossPhase"]);
    const boss = first(steps.at(-1)!.state);
    expect(boss).toMatchObject({ hp: 40, quirk: "helmet", phased: true });
    expect(boss.weakness).not.toBe(7);

    const later = { ...steps.at(-1)!.state };
    const knocked = {
      ...later,
      enemies: later.enemies.map((e, i) => (i === 0 ? { ...e, quirk: null, weakness: 7 } : e)),
    };
    expect(events(act(knocked, tap(2), tap(3)), cast)).not.toContain("bossPhase");
  });
});

describe("lucky monster", () => {
  const level = findLevel("add_2");
  const withLucky = () => {
    const seed = Array.from({ length: 200 }, (_, i) => i + 1).find((s) => openingState(level, s).enemies.some(isLucky));
    expect(seed).toBeDefined();
    return openingState(level, seed!);
  };

  it("turns up now and then, and never on the first level of a land", () => {
    const seeds = Array.from({ length: 300 }, (_, i) => i + 1);
    const lucky = seeds.filter((seed) => openingState(level, seed).enemies.some(isLucky)).length;
    expect(lucky).toBeGreaterThan(20);
    expect(lucky).toBeLessThan(90);
    expect(seeds.some((seed) => openingState(findLevel("add_1"), seed).enemies.some(isLucky))).toBe(false);
  });

  it("changes nothing else about the wave", () => {
    const state = withLucky();
    const regulars = state.enemies.filter((enemy) => !isLucky(enemy));
    expect(regulars).toHaveLength(level.waves[0]!.length);
    expect(state.aim?.enemyId).toBe(regulars[0]!.id);
  });

  it("cannot be blocked, never attacks, and runs after three turns", () => {
    const state = withLucky();
    const lucky = state.enemies.find(isLucky)!;
    expect(reduce(state, { type: "aim", aim: { enemyId: lucky.id, kind: "parry" } })).toEqual([]);
    const pass: Action = { type: "endTurn" };
    const two = act(state, pass, pass);
    expect(two.enemies.find(isLucky)?.flees).toBe(1);
    const steps = reduce(two, pass);
    expect(steps.map((step) => step.event?.type)).toContain("fled");
    expect(steps.at(-1)!.state.enemies.some(isLucky)).toBe(false);
  });

  it("gives a prize when beaten, and runs when the rest of the wave is beaten first", () => {
    const state = withLucky();
    const lucky = state.enemies.find(isLucky)!;
    const rigged: BattleState = {
      ...state,
      hand: [3, 4, 3, 4, 1, 1, 1].map((value, index) => ({ id: 100 + index, value, used: false })),
      enemies: state.enemies.map((e) => ({ ...e, weakness: 7, hp: 20 })),
    };
    const caught = reduce(
      act(rigged, { type: "aim", aim: { enemyId: lucky.id, kind: "strike" } }, tap(0), tap(1)),
      cast,
    );
    expect(caught.map((step) => step.event?.type)).toEqual(["strike", "defeated", "caught"]);

    const others = rigged.enemies.filter((enemy) => !isLucky(enemy));
    const lone = { ...rigged, enemies: rigged.enemies.filter((e) => isLucky(e) || e.id === others[0]!.id) };
    const cleared = reduce(
      act(lone, { type: "aim", aim: { enemyId: others[0]!.id, kind: "strike" } }, tap(0), tap(1)),
      cast,
    );
    expect(cleared.map((step) => step.event?.type).slice(0, 4)).toEqual(["strike", "defeated", "fled", "waveStart"]);
  });
});

describe("fractions", () => {
  it("only ever deals halves or quarters, and keeps health whole", () => {
    fractionLevels().forEach((level) => {
      const grain = level.grain ?? 1;
      const state = openingState(level, 5);
      expect(state.hand.every((tile) => Number.isInteger(tile.value / grain) && tile.value > 0)).toBe(true);
      expect(level.attack.every(Number.isInteger)).toBe(true);
    });
    const half = rig([1.5, 1, 0.5, 2, 1, 1, 1], { intent: { damage: 3, remaining: 3, turns: 1 } }, "frac_1");
    const near = act(half, { type: "aim", aim: { enemyId: first(half).id, kind: "parry" } }, tap(0), tap(4), cast);
    expect(Number.isInteger(first(near).intent.remaining)).toBe(true);
    expect(Number.isInteger(act(near, { type: "endTurn" }).heroHp)).toBe(true);
  });
});
