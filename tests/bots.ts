import {
  aimTarget,
  createBattle,
  lastState,
  reduce,
  STRIKE_DAMAGE,
  type Action,
  type BattleState,
} from "../src/engine/battle";
import type { Level } from "../src/engine/levels";
import { createRng, type Rng } from "../src/engine/rng";
import { solve, type Solution } from "../src/engine/solver";

export type Bot = (state: BattleState, rng: Rng) => Action[];

export const openingState = (level: Level, seed: number) => createBattle(level, seed)[1].state;

export const applyActions = (state: BattleState, actions: readonly Action[]) =>
  actions.reduce((current, action) => lastState(reduce(current, action), current), state);

const tileIndices = (state: BattleState, used: boolean) =>
  state.hand.flatMap((tile, index) => (tile.used === used ? [index] : []));

const exactAnswer = (state: BattleState, target: number, sizes: { minTiles?: number; maxTiles: number }) =>
  solve(
    state.hand.map((tile) => tile.value),
    state.level.ops,
    target,
    { ...sizes, exclude: tileIndices(state, true) },
  );

const play = (state: BattleState, answer: Solution, aim: Action): Action[] => [
  aim,
  ...answer.tiles.flatMap((index, i): Action[] => {
    const tile = state.hand[index];
    if (!tile) return [];
    const tap: Action = { type: "tapTile", tileId: tile.id };
    const op = answer.ops[i - 1];
    return i === 0 || state.level.ops.length === 1 || !op ? [tap] : [{ type: "tapOp", op }, tap];
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
      const answer = exactAnswer(state, landing.intent.damage, { maxTiles: 2 });
      if (answer) return play(state, answer, { type: "aim", aim: { enemyId: landing.id, kind: "parry" } });
    }
    // Use the shortest answer that finishes the enemy; otherwise hit as hard as the hand allows.
    const options = alive.flatMap((enemy) => {
      const sizes = Array.from({ length: maxTiles - 1 }, (_, i) => i + 2);
      const finisher = sizes.find((size) => (STRIKE_DAMAGE[size] ?? 0) >= enemy.hp) ?? maxTiles;
      const order = [finisher, ...sizes.filter((size) => size !== finisher).reverse()];
      const answer = order.reduce<Solution | null>(
        (found, size) => found ?? exactAnswer(state, enemy.weakness, { minTiles: size, maxTiles: size }),
        null,
      );
      return answer ? [{ enemy, answer }] : [];
    });
    const best = options[0];
    if (!best) return [{ type: "endTurn" }];
    return play(state, best.answer, { type: "aim", aim: { enemyId: best.enemy.id, kind: "strike" } });
  };

/** Taps two random tiles and casts at whatever is aimed. */
export const masherBot: Bot = (state, rng) => {
  const [first, second] = rng
    .shuffle(tileIndices(state, false))
    .slice(0, 2)
    .flatMap((index) => state.hand[index] ?? []);
  if (!first || !second || aimTarget(state) === null) return [{ type: "endTurn" }];
  const op = rng.pick(state.level.ops);
  return [
    { type: "tapTile", tileId: first.id },
    { type: "tapOp", op },
    { type: "tapTile", tileId: second.id },
    { type: "cast" },
    // A rejected second tile leaves a one-tile equation behind; clearing keeps the bot moving.
    { type: "clear" },
  ];
};

export type Outcome = { won: boolean; heroHp: number; turns: number; stars: number };

export const simulate = (level: Level, seed: number, bot: Bot): Outcome => {
  const rng = createRng(seed ^ 0x9e3779b9);
  const start = openingState(level, seed);
  const run = (state: BattleState, turns: number, guard: number): Outcome => {
    if (state.phase !== "player" || guard === 0) {
      return { won: state.phase === "won", heroHp: state.heroHp, turns, stars: state.stars };
    }
    const next = applyActions(state, bot(state, rng));
    const stuck = next === state;
    const after = stuck ? applyActions(state, [{ type: "endTurn" }]) : next;
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

/** Plays like `bot`, but calls "Impossible!" instead of ending the turn when it has nothing to cast. */
export const callerBot =
  (bot: Bot): Bot =>
  (state, rng) => {
    const actions = bot(state, rng);
    const giving = actions.length === 1 && actions[0]?.type === "endTurn";
    return giving && !state.called ? [{ type: "impossible" }] : actions;
  };

/** Mashes tiles until three are left, then calls "Impossible!" and hopes. */
export const mashAndCallBot: Bot = (state, rng) => {
  const left = state.hand.filter((tile) => !tile.used).length;
  return left <= 3 && !state.called ? [{ type: "impossible" }] : masherBot(state, rng);
};
