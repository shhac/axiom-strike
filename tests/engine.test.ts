import { describe, expect, it } from "vitest";
import { createBattle, equationTotal, hintNext, reduce, type Action, type BattleState } from "../src/engine/battle";
import { dealHand, HAND_SIZE } from "../src/engine/deal";
import { applyStep, evaluate, type Op } from "../src/engine/equation";
import { LEVELS } from "../src/engine/levels";
import { createRng } from "../src/engine/rng";
import { solve } from "../src/engine/solver";
import { masherBot, solverBot, winRate } from "./bots";

const [addLevel, subLevel] = [LEVELS[0]!, LEVELS[1]!];

const start = (seed = 7, level = addLevel) => createBattle(level, seed).at(-1)!.state;
const act = (state: BattleState, ...actions: Action[]) =>
  actions.reduce((current, action) => reduce(current, action).at(-1)?.state ?? current, state);

/** Rigs the hand and first enemy so a test can state its sum outright. */
const rig = (
  state: BattleState,
  values: number[],
  enemy: Partial<BattleState["enemies"][number]> = {},
): BattleState => ({
  ...state,
  hand: values.map((value, index) => ({ id: 100 + index, value, used: false })),
  enemies: state.enemies.map((e, index) => (index === 0 ? { ...e, ...enemy } : e)),
});
/** True if every target has its own two-tile exact answer, with no tile shared between them. */
const disjointAnswers = (hand: number[], ops: readonly Op[], targets: number[], used: number[]): boolean => {
  const [target, ...rest] = targets;
  if (target === undefined) return true;
  const free = hand.flatMap((_, index) => (used.includes(index) ? [] : [index]));
  return free.some((i) =>
    free.some(
      (j) =>
        i !== j &&
        ops.some((op) => applyStep(hand[i]!, { op, value: hand[j]! }) === target) &&
        disjointAnswers(hand, ops, rest, [...used, i, j]),
    ),
  );
};

const tap = (index: number): Action => ({ type: "tapTile", tileId: 100 + index });

describe("equation", () => {
  it("evaluates left to right without precedence", () => {
    expect(
      evaluate(2, [
        { op: "+", value: 3 },
        { op: "×", value: 4 },
      ]),
    ).toBe(20);
  });
  it("rejects negative and fractional running totals", () => {
    expect(evaluate(3, [{ op: "-", value: 5 }])).toBeNull();
    expect(evaluate(7, [{ op: "÷", value: 2 }])).toBeNull();
    expect(evaluate(8, [{ op: "÷", value: 0 }])).toBeNull();
  });
});

describe("solver", () => {
  it("prefers the fewest tiles", () => {
    expect(solve([1, 2, 3, 4, 5], ["+"], 9)?.tiles.length).toBe(2);
  });
  it("continues an equation already started", () => {
    const answer = solve([4, 1, 2, 9], ["+"], 7, { prefix: { tiles: [0], ops: [] } });
    expect(answer?.tiles).toEqual([0, 1, 2]);
  });
  it("returns null when no exact answer exists", () => {
    expect(solve([2, 2, 2], ["+"], 5)).toBeNull();
  });
});

describe("deal guarantee", () => {
  it.each([addLevel, subLevel])("always has disjoint exact answers ($id)", (level) => {
    const failures = Array.from({ length: 2000 }, (_, seed) => {
      const rng = createRng(seed + 1);
      const strike = rng.int(level.weakness[0], level.weakness[1]);
      const parries = Array.from({ length: seed % 3 }, () => rng.int(level.attack[0], level.attack[1]));
      const hand = dealHand(rng, level, strike, parries);
      if (hand.length !== HAND_SIZE || hand.some((value) => value < 1 || value > level.tileMax)) return seed;

      return disjointAnswers(hand, level.ops, [...parries, strike], []) ? null : seed;
    }).filter((seed) => seed !== null);
    expect(failures).toEqual([]);
  });

  it("usually offers a three-tile strike when at most one attack lands", () => {
    const hits = Array.from({ length: 500 }, (_, seed) => {
      const rng = createRng(seed + 1);
      const strike = rng.int(addLevel.weakness[0], addLevel.weakness[1]);
      const hand = dealHand(rng, addLevel, strike, [rng.int(4, 12)]);
      return solve(hand, addLevel.ops, strike, { minTiles: 3, maxTiles: 3 }) !== null;
    }).filter(Boolean).length;
    expect(hits / 500).toBeGreaterThan(0.9);
  });
});

describe("battle rules", () => {
  it("starts with a hand, an aim, and no attack due on the first turn", () => {
    const state = start();
    expect(state.hand).toHaveLength(HAND_SIZE);
    expect(state.aim).toEqual({ enemyId: state.enemies[0]!.id, kind: "strike" });
    expect(state.enemies.every((enemy) => enemy.intent.turns >= 2)).toBe(true);
  });

  it("shows a running total and lets tiles be undone", () => {
    const state = act(rig(start(), [3, 4, 5]), tap(0), tap(1));
    expect(equationTotal(state)).toBe(7);
    const undone = act(state, { type: "undo" });
    expect(equationTotal(undone)).toBe(3);
    expect(undone.hand[1]!.used).toBe(false);
  });

  it("an exact two-tile strike deals 20 and consumes its tiles", () => {
    const rigged = rig(start(), [3, 4, 5, 6], { weakness: 7, hp: 40, maxHp: 40 });
    const state = act(rigged, tap(0), tap(1), { type: "cast" });
    expect(state.enemies[0]!.hp).toBe(20);
    expect(state.hand.filter((tile) => tile.used)).toHaveLength(2);
  });

  it("longer exact equations hit harder", () => {
    const rigged = rig(start(), [3, 4, 5, 6], { weakness: 12, hp: 40, maxHp: 40 });
    const state = act(rigged, tap(0), tap(1), tap(2), { type: "cast" });
    expect(state.enemies[0]!.hp).toBe(5);
  });

  it("a surviving enemy changes weakness after an exact hit", () => {
    const rigged = rig(start(), [3, 4, 5, 6], { weakness: 7, hp: 40, maxHp: 40 });
    const state = act(rigged, tap(0), tap(1), { type: "cast" });
    expect(state.enemies[0]!.weakness).not.toBe(7);
  });

  it("one away scratches, anything further misses", () => {
    const rigged = rig(start(), [3, 4, 9, 9], { weakness: 8, hp: 40, maxHp: 40 });
    expect(act(rigged, tap(0), tap(1), { type: "cast" }).enemies[0]!.hp).toBe(39);
    expect(act(rigged, tap(2), tap(3), { type: "cast" }).enemies[0]!.hp).toBe(40);
  });

  it("adding a number and taking it away again earns no extra power", () => {
    const base = rig(start(7, subLevel), [3, 4, 5, 5, 1, 1], { weakness: 7, hp: 100, maxHp: 100 });
    const state = act(
      base,
      tap(0),
      { type: "tapOp", op: "+" },
      tap(1),
      { type: "tapOp", op: "+" },
      tap(2),
      { type: "tapOp", op: "-" },
      tap(3),
      { type: "cast" },
    );
    expect(state.enemies[0]!.hp).toBe(80);
  });

  it("rejects a tile that needs an operator, or that would go below zero", () => {
    const base = rig(start(7, subLevel), [3, 9]);
    const noOp = reduce(act(base, tap(0)), tap(1));
    expect(noOp[0]?.event).toEqual({ type: "rejected", reason: "needOperator" });
    const negative = reduce(act(base, tap(0), { type: "tapOp", op: "-" }), tap(1));
    expect(negative[0]?.event).toEqual({ type: "rejected", reason: "badStep" });
  });

  it("an exact parry cancels the attack and counters", () => {
    const rigged = rig(start(), [3, 4, 1, 1], { hp: 40, maxHp: 40, intent: { damage: 7, remaining: 7, turns: 1 } });
    const enemyId = rigged.enemies[0]!.id;
    const state = act(rigged, { type: "aim", aim: { enemyId, kind: "parry" } }, tap(0), tap(1), { type: "cast" });
    expect(state.enemies[0]!.hp).toBe(30);
    expect(state.enemies[0]!.intent.turns).toBeGreaterThanOrEqual(2);
    expect(act(state, { type: "endTurn" }).heroHp).toBe(100);
  });

  it("a near-miss parry blocks at most half", () => {
    const rigged = rig(start(), [3, 4, 1, 1], { intent: { damage: 8, remaining: 8, turns: 1 } });
    const enemyId = rigged.enemies[0]!.id;
    const state = act(rigged, { type: "aim", aim: { enemyId, kind: "parry" } }, tap(0), tap(1), { type: "cast" });
    expect(state.enemies[0]!.intent.remaining).toBe(4);
    expect(act(state, { type: "endTurn" }).heroHp).toBe(96);
  });

  it("an unparried attack lands for its number when the countdown ends", () => {
    const rigged = rig(start(), [1, 1, 1], { intent: { damage: 9, remaining: 9, turns: 1 } });
    const steps = reduce(rigged, { type: "endTurn" });
    expect(steps.some((step) => step.event?.type === "enemyAttack")).toBe(true);
    expect(steps.at(-1)!.state.heroHp).toBe(91);
    expect(steps.at(-1)!.state.hand.every((tile) => !tile.used)).toBe(true);
  });

  it("ends the turn by itself when fewer than two tiles are left", () => {
    const rigged = rig(start(), [3, 4, 9], { weakness: 7, hp: 40, maxHp: 40 });
    const state = act(rigged, tap(0), tap(1), { type: "cast" });
    expect(state.turn).toBe(rigged.turn + 1);
    expect(state.hand).toHaveLength(HAND_SIZE);
  });

  it("clearing a wave brings the next one, and clearing the last wins", () => {
    const opening = start();
    const first = rig({ ...opening, enemies: opening.enemies.slice(0, 1) }, [3, 4, 1, 1], { weakness: 7 });
    const second = act(first, tap(0), tap(1), { type: "cast" });
    expect(second.wave).toBe(1);
    expect(second.enemies).toHaveLength(2);

    const lastWave = { ...second, wave: addLevel.waves.length - 1, enemies: second.enemies.slice(0, 1) };
    const won = act(rig(lastWave, [3, 4, 1, 1], { weakness: 7, hp: 20 }), tap(0), tap(1), { type: "cast" });
    expect(won.phase).toBe("won");
    expect(won.stars).toBe(3);
  });

  it("losing all health ends the battle", () => {
    const rigged = { ...rig(start(), [1, 1], { intent: { damage: 9, remaining: 9, turns: 1 } }), heroHp: 5 };
    expect(act(rigged, { type: "endTurn" }).phase).toBe("lost");
  });

  it("a hint costs a charge and shows the path to the aimed number", () => {
    const rigged = rig(start(), [9, 3, 4, 9], { weakness: 7 });
    const hinted = act(rigged, { type: "hint" });
    expect(hinted.hints).toBe(rigged.hints - 1);
    expect(hintNext(hinted)?.tileId).toBe(101);
    expect(hintNext(act(hinted, tap(1)))?.tileId).toBe(102);
  });

  it("a hint is free when there is no exact answer", () => {
    const rigged = rig(start(), [9, 9, 9], { weakness: 7 });
    const steps = reduce(rigged, { type: "hint" });
    expect(steps[0]?.event).toEqual({ type: "rejected", reason: "noExact" });
    expect(steps[0]?.state.hints).toBe(rigged.hints);
  });
});

describe("simulated players", () => {
  it("a child who only adds two numbers wins the first level", () => {
    const result = winRate(addLevel, solverBot(2), 300);
    console.log("two-tile bot, level 1:", JSON.stringify(result));
    expect(result.rate).toBeGreaterThanOrEqual(0.9);
  });

  it("a child who never parries still gets through the first level", () => {
    const result = winRate(addLevel, solverBot(2, { parries: false }), 300);
    console.log("two-tile bot that never parries, level 1:", JSON.stringify(result));
    expect(result.rate).toBeGreaterThanOrEqual(0.9);
  });

  it("longer equations finish faster than two-tile play", () => {
    const short = winRate(addLevel, solverBot(2), 300);
    const long = winRate(addLevel, solverBot(4), 300);
    console.log("four-tile bot, level 1:", JSON.stringify(long));
    expect(long.meanTurns).toBeLessThan(short.meanTurns);
  });

  it("random mashing mostly loses", () => {
    const result = winRate(addLevel, masherBot, 300);
    console.log("masher, level 1:", JSON.stringify(result));
    expect(result.rate).toBeLessThan(0.25);
  });

  it("the second level is winnable with exact play", () => {
    const result = winRate(subLevel, solverBot(3), 300);
    console.log("three-tile bot, level 2:", JSON.stringify(result));
    expect(result.rate).toBeGreaterThanOrEqual(0.9);
  });
});
