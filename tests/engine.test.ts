import { describe, expect, it } from "vitest";
import { createBattle, equationTotal, hintNext, reduce, type Action, type BattleState } from "../src/engine/battle";
import { dealHand, HAND_SIZE } from "../src/engine/deal";
import { applyStep, bracketEnds, evaluate, type Op } from "../src/engine/equation";
import { findLevel, LEVELS, TIERS, tuneLevel } from "../src/engine/levels";
import { createRng } from "../src/engine/rng";
import { solve } from "../src/engine/solver";
import { applyActions, callerBot, mashAndCallBot, masherBot, openingState, solverBot, winRate } from "./bots";

const [addLevel, subLevel] = [findLevel("add_1"), findLevel("sub_1")];

/** Every level as it can actually be played: at its own numbers, and one band easier and harder. */
const TUNED = LEVELS.flatMap((level) =>
  TIERS.map((tier) => ({ name: `${level.id} ${tier}`, level: tuneLevel(level, tier) })),
);

const start = (seed = 7, level = addLevel) => openingState(level, seed);
const act = (state: BattleState, ...actions: Action[]) => applyActions(state, actions);

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
  it("brackets the part so far when times or divide follows plus or minus", () => {
    expect(bracketEnds(["+", "×"])).toEqual([1]);
    expect(bracketEnds(["+", "+", "÷"])).toEqual([2]);
    expect(bracketEnds(["+", "×", "+", "×"])).toEqual([1, 3]);
    expect(bracketEnds(["-", "÷"])).toEqual([1]);
  });
  it("needs no brackets where the usual order already agrees", () => {
    expect(bracketEnds(["×", "+"])).toEqual([]);
    expect(bracketEnds(["÷", "×", "÷"])).toEqual([]);
    expect(bracketEnds(["+", "-", "+"])).toEqual([]);
    expect(bracketEnds(["×"])).toEqual([]);
    expect(bracketEnds([])).toEqual([]);
  });
  it("applies each step to the total so far", () => {
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
  it("skips excluded tiles and keeps answers as indices into the full hand", () => {
    expect(solve([5, 3, 4], ["+"], 7, { exclude: [0] })?.tiles).toEqual([1, 2]);
    expect(solve([3, 4, 9], ["+"], 7, { exclude: [1] })).toBeNull();
  });
  it("skips excluded tiles when continuing an equation", () => {
    const answer = solve([4, 1, 2, 3], ["+"], 7, { prefix: { tiles: [0], ops: [] }, exclude: [3] });
    expect(answer?.tiles).toEqual([0, 1, 2]);
  });
});

describe("deal guarantee", () => {
  it.each(TUNED)("always has disjoint exact answers ($name)", ({ level }) => {
    const failures = Array.from({ length: 600 }, (_, seed) => {
      const rng = createRng(seed + 1);
      const strike = rng.pick(level.weakness);
      // Rage can push an attack past the level's usual numbers, so the promise is tested there too.
      const raged = (n: number) => (level.rage ? Math.min(level.tileMax * 2 - 1, n + (seed % 4) * 2) : n);
      const parries = Array.from({ length: seed % 3 }, () => Math.max(raged(rng.pick(level.attack)), 0));
      const hand = dealHand(rng, level, strike, parries);
      if (hand.length !== HAND_SIZE || hand.some((value) => value < 1 || value > level.tileMax)) return seed;

      return disjointAnswers(hand, level.ops, [...parries, strike], []) ? null : seed;
    }).filter((seed) => seed !== null);
    expect(failures).toEqual([]);
  });

  it("usually offers a three-tile strike when at most one attack lands", () => {
    const hits = Array.from({ length: 500 }, (_, seed) => {
      const rng = createRng(seed + 1);
      const strike = rng.pick(addLevel.weakness);
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

  it("multiplying by one is still a right answer and hits as a two-number strike", () => {
    const base = rig(start(7, findLevel("mul_1")), [6, 1], { weakness: 6, hp: 40, maxHp: 40 });
    const state = act(base, tap(0), { type: "tapOp", op: "×" }, tap(1), { type: "cast" });
    expect(state.enemies[0]!.hp).toBe(20);
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

  it("stars follow the health left at the end: 3 from 70, 2 from 35, otherwise 1", () => {
    const finish = (heroHp: number) => {
      const opening = start();
      const lastWave = { ...opening, heroHp, wave: addLevel.waves.length - 1, enemies: opening.enemies.slice(0, 1) };
      return act(rig(lastWave, [3, 4], { weakness: 7, hp: 20 }), tap(0), tap(1), { type: "cast" }).stars;
    };
    expect([100, 70, 69, 35, 34, 1].map(finish)).toEqual([3, 3, 2, 2, 1, 1]);
  });

  it("explains every refused action", () => {
    const base = rig(start(), [3, 4, 9], { weakness: 7 });
    const reason = (state: BattleState, action: Action) => {
      const event = reduce(state, action)[0]?.event;
      return event?.type === "rejected" ? event.reason : null;
    };
    expect(reason(act(base, tap(0)), { type: "cast" })).toBe("tooShort");
    expect(reason({ ...act(base, tap(0), tap(1)), aim: null }, { type: "cast" })).toBe("noAim");
    expect(reason({ ...base, hints: 0 }, { type: "hint" })).toBe("noHints");
    expect(reason({ ...base, aim: null }, { type: "hint" })).toBe("noAim");
    expect(reason(base, { type: "potion" })).toBe("noPotions");
    expect(reason({ ...base, potions: 1 }, { type: "potion" })).toBe("fullHealth");
    expect(reason({ ...base, called: true }, { type: "impossible" })).toBe("alreadyCalled");
    expect(reason({ ...base, aim: null }, { type: "impossible" })).toBe("noAim");
  });

  describe("calling Impossible", () => {
    const call: Action = { type: "impossible" };
    const countdowns = (state: BattleState) => state.enemies.map((enemy) => enemy.intent.turns);

    it("a right call trades the unspent tiles for ones that can make the number, and costs no turn", () => {
      const stuck = rig(start(), [3, 4, 9, 9, 9], { weakness: 7, hp: 40 });
      const struck = act(stuck, tap(0), tap(1), { type: "cast" });
      const target = struck.enemies[0]!.weakness;
      const rigged = { ...struck, hand: struck.hand.map((tile) => (tile.used ? tile : { ...tile, value: 30 })) };
      const steps = reduce(rigged, call);
      const after = steps.at(-1)!.state;
      expect(steps.map((step) => step.event?.type)).toEqual(["sharpEye"]);
      expect(after.hand.map((tile) => tile.used)).toEqual(rigged.hand.map((tile) => tile.used));
      expect(
        solve(
          after.hand.map((t) => t.value),
          after.level.ops,
          target,
          { exclude: [0, 1], maxTiles: 2 },
        ),
      ).not.toBeNull();
      expect([after.turn, countdowns(after), after.called]).toEqual([rigged.turn, countdowns(rigged), true]);
    });

    it("a wrong call changes nothing but uses up the call", () => {
      const fine = rig(start(), [3, 4, 9], { weakness: 7 });
      const steps = reduce(act(fine, tap(2)), call);
      expect(steps.map((step) => step.event?.type)).toEqual(["lookAgain"]);
      expect(steps[0]?.state).toEqual({ ...fine, called: true });
    });

    it("tiles thrown away on a wrong answer still count, so wasting them cannot earn a call", () => {
      const wasteful = act(rig(start(), [3, 4, 1, 1], { weakness: 7 }), tap(0), tap(2), { type: "cast" });
      expect(reduce(wasteful, call)[0]?.event?.type).toBe("lookAgain");
    });

    it("tiles spent on a right answer do not count, even if they could make the number again", () => {
      const first = rig(start(), [3, 4, 9, 9], { weakness: 7, hp: 40 });
      const struck = act(first, tap(0), tap(1), { type: "cast" });
      const sameTarget = rig(
        struck,
        struck.hand.map((tile) => tile.value),
        { weakness: 7 },
      );
      const again = { ...sameTarget, hand: struck.hand };
      expect(reduce(again, call)[0]?.event?.type).toBe("sharpEye");
    });

    it("tiles thrown away on a wrong parry count too, and so do two wrong answers in a row", () => {
      const base = rig(start(), [3, 4, 1, 1, 2, 2], { weakness: 30 });
      const enemy = base.enemies[0]!;
      const parrying = {
        ...base,
        aim: { enemyId: enemy.id, kind: "parry" as const },
        enemies: base.enemies.map((e) =>
          e.id === enemy.id ? { ...e, intent: { ...e.intent, damage: 7, remaining: 7 } } : e,
        ),
      };
      const once = act(parrying, tap(0), tap(2), { type: "cast" });
      const twice = act(once, tap(1), tap(3), { type: "cast" });
      expect(twice.enemies[0]!.intent.damage).toBe(7);
      expect(reduce(twice, call)[0]?.event?.type).toBe("lookAgain");
    });

    it("a swap hands out fresh tile ids and is the same for the same seed", () => {
      const stuck = rig(start(), [9, 9, 9, 9], { weakness: 7 });
      const after = act(stuck, call);
      const ids = after.hand.map((tile) => tile.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.every((id) => id >= stuck.nextId)).toBe(true);
      expect(after.nextId).toBe(stuck.nextId + 4);
      expect(after.seed).not.toBe(stuck.seed);
      expect(act(stuck, call)).toEqual(after);
    });

    it("the call comes back when the next turn is dealt", () => {
      const called = act(rig(start(), [9, 9, 9], { weakness: 7 }), call);
      expect(called.called).toBe(true);
      expect(act(called, { type: "endTurn" }).called).toBe(false);
    });
  });

  it("a potion heals 30, never past full health, and is used up", () => {
    const hurt = { ...start(), heroHp: 50, potions: 2 };
    const healed = act(hurt, { type: "potion" });
    expect([healed.heroHp, healed.potions]).toEqual([80, 1]);
    expect(act(healed, { type: "potion" }).heroHp).toBe(100);
  });

  it("carried hint scrolls add to the three free hints", () => {
    expect(createBattle(addLevel, 7, { scrolls: 2, potions: 1 })[1].state).toMatchObject({ hints: 5, potions: 1 });
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

  it.each(TUNED)("$name is winnable with two-number answers", ({ level }) => {
    expect(winRate(level, solverBot(2), 60).rate).toBeGreaterThanOrEqual(0.9);
  });

  it.each(TUNED)("$name is not winnable by mashing", ({ level }) => {
    expect(winRate(level, masherBot, 60).rate).toBeLessThan(0.3);
  });

  it("calling Impossible when stuck finishes sooner, never later", () => {
    [addLevel, findLevel("div_5")].forEach((level) => {
      const plain = winRate(level, solverBot(2), 200);
      const calling = winRate(level, callerBot(solverBot(2)), 200);
      expect(calling.rate).toBeGreaterThanOrEqual(plain.rate);
      expect(calling.meanTurns).toBeLessThan(plain.meanTurns);
    });
  });

  // Looser than plain mashing: a blind call is right now and then and hands over an easy pair.
  it.each(TUNED)("$name is not winnable by mashing and calling Impossible blindly", ({ level }) => {
    expect(winRate(level, mashAndCallBot, 60).rate).toBeLessThan(0.45);
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

  it("a gentler tier is kinder and a tougher tier harsher to a child who never parries", () => {
    const level = findLevel("add_3");
    const [gentle, standard, tough] = TIERS.map(
      (tier) => winRate(tuneLevel(level, tier), solverBot(2, { parries: false }), 200).meanHp,
    );
    expect(gentle).toBeGreaterThan(standard!);
    expect(standard).toBeGreaterThan(tough!);
  });
});
