import { aimTarget, createBattle, reduce, STRIKE_DAMAGE, type Action, type BattleState } from "../src/engine/battle";
import type { Level } from "../src/engine/levels";
import { createRng, type Rng } from "../src/engine/rng";
import { solve } from "../src/engine/solver";

export type Bot = (state: BattleState, rng: Rng) => Action[];

const freeIndices = (state: BattleState) => state.hand.flatMap((tile, index) => (tile.used ? [] : [index]));

const exactFor = (state: BattleState, target: number, maxTiles: number) => {
  const used = state.hand.flatMap((tile, index) => (tile.used ? [index] : []));
  return solve(
    state.hand.map((tile) => tile.value),
    state.level.ops,
    target,
    { maxTiles, exclude: used },
  );
};

const play = (state: BattleState, tiles: number[], ops: string[], aim: Action): Action[] => [
  aim,
  ...tiles.flatMap((index, i): Action[] => {
    const tap: Action = { type: "tapTile", tileId: state.hand[index]!.id };
    const op = ops[i - 1];
    return i === 0 || state.level.ops.length === 1 || !op ? [tap] : [{ type: "tapOp", op: op as never }, tap];
  }),
  { type: "cast" },
];

/** Parries whatever lands this turn, then strikes, using exact answers of at most `maxTiles`. */
export const solverBot =
  (maxTiles: number, habits: { parries?: boolean } = {}): Bot =>
  (state) => {
    const alive = state.enemies.filter((enemy) => enemy.hp > 0);
    const landing = alive.find((enemy) => enemy.intent.turns === 1 && enemy.intent.remaining > 0);
    if (landing && habits.parries !== false) {
      const answer = exactFor(state, landing.intent.damage, 2);
      if (answer)
        return play(state, answer.tiles, answer.ops, { type: "aim", aim: { enemyId: landing.id, kind: "parry" } });
    }
    // Use the shortest answer that finishes the enemy; otherwise hit as hard as the hand allows.
    const options = alive.flatMap((enemy) => {
      const sizes = Array.from({ length: maxTiles - 1 }, (_, i) => i + 2);
      const finisher = sizes.find((size) => (STRIKE_DAMAGE[size] ?? 0) >= enemy.hp) ?? maxTiles;
      const order = [finisher, ...sizes.filter((size) => size !== finisher).reverse()];
      const answer = order.reduce<ReturnType<typeof exactFor>>(
        (found, size) => found ?? exactOfSize(state, enemy.weakness, size),
        null,
      );
      return answer ? [{ enemy, answer }] : [];
    });
    const best = options[0];
    if (!best) return [{ type: "endTurn" }];
    return play(state, best.answer.tiles, best.answer.ops, {
      type: "aim",
      aim: { enemyId: best.enemy.id, kind: "strike" },
    });
  };

const exactOfSize = (state: BattleState, target: number, size: number) => {
  const used = state.hand.flatMap((tile, index) => (tile.used ? [index] : []));
  return solve(
    state.hand.map((tile) => tile.value),
    state.level.ops,
    target,
    { minTiles: size, maxTiles: size, exclude: used },
  );
};

/** Taps two random tiles and casts at whatever is aimed. */
export const masherBot: Bot = (state, rng) => {
  const free = rng.shuffle(freeIndices(state)).slice(0, 2);
  if (free.length < 2 || aimTarget(state) === null) return [{ type: "endTurn" }];
  const op = rng.pick(state.level.ops);
  return [
    { type: "tapTile", tileId: state.hand[free[0]!]!.id },
    { type: "tapOp", op },
    { type: "tapTile", tileId: state.hand[free[1]!]!.id },
    { type: "cast" },
    // A rejected second tile leaves a one-tile equation behind; clearing keeps the bot moving.
    { type: "clear" },
  ];
};

export type Outcome = { won: boolean; heroHp: number; turns: number; stars: number };

export const simulate = (level: Level, seed: number, bot: Bot): Outcome => {
  const rng = createRng(seed ^ 0x9e3779b9);
  const start = createBattle(level, seed).at(-1)!.state;
  const run = (state: BattleState, turns: number, guard: number): Outcome => {
    if (state.phase !== "player" || guard === 0) {
      return { won: state.phase === "won", heroHp: state.heroHp, turns, stars: state.stars };
    }
    const next = bot(state, rng).reduce((current, action) => reduce(current, action).at(-1)?.state ?? current, state);
    const stuck = next === state;
    const after = stuck ? (reduce(state, { type: "endTurn" }).at(-1)?.state ?? state) : next;
    const turnPassed = after.turn !== state.turn || after.wave !== state.wave;
    return run(after, turns + (turnPassed ? 1 : 0), guard - 1);
  };
  return run(start, 0, 2000);
};

export const winRate = (level: Level, bot: Bot, seeds: number) => {
  const outcomes = Array.from({ length: seeds }, (_, seed) => simulate(level, seed + 1, bot));
  const wins = outcomes.filter((outcome) => outcome.won);
  const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
  return {
    rate: wins.length / seeds,
    meanTurns: mean(wins.map((outcome) => outcome.turns)),
    meanHp: mean(wins.map((outcome) => outcome.heroHp)),
  };
};
