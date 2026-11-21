import { dealHand } from "./deal";
import { applyStep, type Op } from "./equation";
import { ENEMY_HP, type EnemyKind, type Level, type OpFamily } from "./levels";
import { createRng, type Rng } from "./rng";
import { solve, type Solution } from "./solver";

export const HERO_MAX_HP = 100;
export const HINTS_PER_LEVEL = 3;

export type Tile = { id: number; value: number; used: boolean };

export type Intent = { damage: number; remaining: number; turns: number };

export type Enemy = {
  id: number;
  kind: EnemyKind;
  family: OpFamily;
  hp: number;
  maxHp: number;
  weakness: number;
  intent: Intent;
  /** Grows each time this enemy lands a hit nobody tried to parry; its attacks grow with it. */
  rage: number;
};

export type AimKind = "strike" | "parry";
export type Aim = { enemyId: number; kind: AimKind };

export type Equation = { tiles: number[]; ops: Op[]; pendingOp: Op | null };

export type Phase = "player" | "won" | "lost";

export type BattleState = {
  level: Level;
  seed: number;
  wave: number;
  turn: number;
  phase: Phase;
  heroHp: number;
  enemies: Enemy[];
  hand: Tile[];
  equation: Equation;
  aim: Aim | null;
  hints: number;
  hintPath: Solution | null;
  nextId: number;
  stars: number;
};

export type BattleEvent =
  | { type: "waveStart"; wave: number }
  | { type: "deal" }
  | { type: "strike"; enemyId: number; damage: number; exact: boolean; power: number }
  | { type: "parry"; enemyId: number; exact: boolean; blocked: number; counter: number }
  | { type: "defeated"; enemyId: number }
  | { type: "weaknessShift"; enemyId: number }
  | { type: "enemyAttack"; enemyId: number; damage: number }
  | { type: "won"; stars: number }
  | { type: "lost" }
  | { type: "rejected"; reason: "needOperator" | "badStep" | "tooShort" | "noAim" | "noHints" | "noExact" };

/** One beat of the battle: the state to show, and what just happened to get there. */
export type Step = { state: BattleState; event: BattleEvent | null };

export type Action =
  | { type: "tapTile"; tileId: number }
  | { type: "tapOp"; op: Op }
  | { type: "undo" }
  | { type: "clear" }
  | { type: "aim"; aim: Aim }
  | { type: "cast" }
  | { type: "endTurn" }
  | { type: "hint" };

export const STRIKE_DAMAGE = [0, 0, 20, 35, 55, 80] as const;
const COUNTER_PER_POWER = 5;
/** One away still scratches; anything further misses, so guessing gets nowhere. */
const NEAR_MISS_DAMAGE = 1;
/** The deal can only promise exact parries for this many attacks in one turn. */
const MAX_LANDING_TOGETHER = 2;

const EMPTY_EQUATION: Equation = { tiles: [], ops: [], pendingOp: null };

const living = (state: BattleState) => state.enemies.filter((enemy) => enemy.hp > 0);

const tileValue = (state: BattleState, tileId: number) => state.hand.find((tile) => tile.id === tileId)?.value;

/** Running totals after each tile of the equation; empty if nothing is placed. */
export const runningTotals = (state: BattleState): number[] => {
  const values = state.equation.tiles.map((id) => tileValue(state, id) ?? 0);
  return values.reduce<number[]>((totals, value, index) => {
    if (index === 0) return [value];
    const op = state.equation.ops[index - 1];
    const previous = totals[totals.length - 1];
    if (op === undefined || previous === undefined) return totals;
    return [...totals, applyStep(previous, { op, value }) ?? previous];
  }, []);
};

export const equationTotal = (state: BattleState): number | null => runningTotals(state).at(-1) ?? null;

/**
 * How many tiles it really took to reach the final total. `3 + 4 + 5 - 5` is still a two-tile
 * seven, so adding a number and taking it away again earns nothing.
 */
const equationPower = (totals: readonly number[]): number => {
  const final = totals.at(-1);
  return final === undefined ? 0 : totals.indexOf(final) + 1;
};

export const aimTarget = (state: BattleState): number | null => {
  const enemy = state.enemies.find((candidate) => candidate.id === state.aim?.enemyId);
  if (!enemy || !state.aim) return null;
  return state.aim.kind === "strike" ? enemy.weakness : enemy.intent.damage;
};

const withRng = <T>(state: BattleState, use: (rng: Rng) => T): [T, number] => {
  const rng = createRng(state.seed);
  const result = use(rng);
  return [result, Math.floor(rng.next() * 4294967296)];
};

/** Enemies wind up again in two turns, or three if two others would already land that turn. */
const rollTurns = (others: readonly Enemy[]): number =>
  others.filter((enemy) => enemy.intent.turns === 2).length >= MAX_LANDING_TOGETHER ? 3 : 2;

const RAGE_STEP = 2;
const MAX_RAGE = 3;

/** Ignored attacks get bigger, but never beyond what two tiles can still answer. */
const attackCeiling = (level: Level) =>
  level.ops.includes("+") ? Math.min(level.attack[1] + RAGE_STEP * MAX_RAGE, level.tileMax * 2 - 1) : level.attack[1];

const rollIntent = (rng: Rng, level: Level, others: readonly Enemy[], rage: number): Intent => {
  const damage = Math.min(attackCeiling(level), rng.int(level.attack[0], level.attack[1]) + RAGE_STEP * rage);
  return { damage, remaining: damage, turns: rollTurns(others) };
};

const rollWeakness = (rng: Rng, level: Level, avoid?: number): number => {
  const options = Array.from({ length: level.weakness[1] - level.weakness[0] + 1 }, (_, i) => level.weakness[0] + i);
  return rng.pick(options.filter((value) => value !== avoid));
};

const defaultAim = (state: BattleState): Aim | null => {
  const aimed = living(state).find((enemy) => enemy.id === state.aim?.enemyId);
  if (aimed && state.aim) return state.aim;
  const first = living(state)[0];
  return first ? { enemyId: first.id, kind: "strike" } : null;
};

const dealStep = (state: BattleState): Step => {
  const aim = defaultAim(state);
  const strikeEnemy = living(state).find((enemy) => enemy.id === aim?.enemyId) ?? living(state)[0];
  const landing = living(state)
    .filter((enemy) => enemy.intent.turns === 1 && enemy.intent.remaining > 0)
    .map((enemy) => enemy.intent.damage);
  const [values, seed] = withRng(state, (rng) =>
    dealHand(rng, state.level, strikeEnemy?.weakness ?? state.level.weakness[0], landing),
  );
  const hand = values.map((value, index) => ({ id: state.nextId + index, value, used: false }));
  return {
    state: {
      ...state,
      seed,
      hand,
      nextId: state.nextId + hand.length,
      equation: EMPTY_EQUATION,
      hintPath: null,
      aim,
      turn: state.turn + 1,
    },
    event: { type: "deal" },
  };
};

const waveStep = (state: BattleState, wave: number): Step => {
  const specs = state.level.waves[wave] ?? [];
  const [enemies, seed] = withRng(state, (rng) =>
    specs.map((spec, index): Enemy => {
      const damage = rng.int(state.level.attack[0], state.level.attack[1]);
      return {
        id: state.nextId + index,
        kind: spec.kind,
        family: spec.family,
        hp: ENEMY_HP[spec.kind],
        maxHp: ENEMY_HP[spec.kind],
        weakness: rollWeakness(rng, state.level),
        // Staggered so nothing lands on the first turn of a wave and at most two land together.
        intent: { damage, remaining: damage, turns: 2 + (index % 2) },
        rage: 0,
      };
    }),
  );
  return {
    state: { ...state, seed, wave, enemies, nextId: state.nextId + enemies.length, aim: null, hand: [] },
    event: { type: "waveStart", wave },
  };
};

export const createBattle = (level: Level, seed: number): Step[] => {
  const blank: BattleState = {
    level,
    seed,
    wave: 0,
    turn: 0,
    phase: "player",
    heroHp: HERO_MAX_HP,
    enemies: [],
    hand: [],
    equation: EMPTY_EQUATION,
    aim: null,
    hints: HINTS_PER_LEVEL,
    hintPath: null,
    nextId: 1,
    stars: 0,
  };
  const wave = waveStep(blank, 0);
  return [wave, dealStep(wave.state)];
};

const reject = (state: BattleState, reason: Extract<BattleEvent, { type: "rejected" }>["reason"]): Step[] => [
  { state, event: { type: "rejected", reason } },
];

const quiet = (state: BattleState): Step[] => [{ state, event: null }];

const tapTile = (state: BattleState, tileId: number): Step[] => {
  const tile = state.hand.find((candidate) => candidate.id === tileId);
  if (!tile || tile.used) return [];
  const { equation } = state;
  const take = (next: Equation) =>
    quiet({
      ...state,
      equation: next,
      hand: state.hand.map((t) => (t.id === tileId ? { ...t, used: true } : t)),
    });

  if (equation.tiles.length === 0) return take({ tiles: [tileId], ops: [], pendingOp: null });

  const onlyOp = state.level.ops.length === 1 ? state.level.ops[0] : undefined;
  const op = equation.pendingOp ?? onlyOp;
  if (!op) return reject(state, "needOperator");

  const total = equationTotal(state);
  if (total === null || applyStep(total, { op, value: tile.value }) === null) return reject(state, "badStep");
  return take({ tiles: [...equation.tiles, tileId], ops: [...equation.ops, op], pendingOp: null });
};

const release = (state: BattleState, tileIds: readonly number[]): Tile[] =>
  state.hand.map((tile) => (tileIds.includes(tile.id) ? { ...tile, used: false } : tile));

const undo = (state: BattleState): Step[] => {
  const { equation } = state;
  if (equation.pendingOp) return quiet({ ...state, equation: { ...equation, pendingOp: null } });
  const last = equation.tiles.at(-1);
  if (last === undefined) return [];
  return quiet({
    ...state,
    hand: release(state, [last]),
    equation: { tiles: equation.tiles.slice(0, -1), ops: equation.ops.slice(0, -1), pendingOp: null },
  });
};

const clear = (state: BattleState): Step[] =>
  state.equation.tiles.length === 0 && !state.equation.pendingOp
    ? []
    : quiet({ ...state, hand: release(state, state.equation.tiles), equation: EMPTY_EQUATION });

const updateEnemy = (state: BattleState, enemyId: number, change: (enemy: Enemy) => Enemy): BattleState => ({
  ...state,
  enemies: state.enemies.map((enemy) => (enemy.id === enemyId ? change(enemy) : enemy)),
});

const starsFor = (heroHp: number) => (heroHp >= HERO_MAX_HP * 0.7 ? 3 : heroHp >= HERO_MAX_HP * 0.35 ? 2 : 1);

/** After damage: mark defeats, then move to the next wave or victory if the field is clear. */
const settle = (state: BattleState, enemyId: number): Step[] => {
  const enemy = state.enemies.find((candidate) => candidate.id === enemyId);
  if (!enemy || enemy.hp > 0) return [];
  const defeated: Step = { state: { ...state, aim: defaultAim(state) }, event: { type: "defeated", enemyId } };
  if (living(state).length > 0) return [defeated];

  const nextWave = state.wave + 1;
  if (nextWave >= state.level.waves.length) {
    const stars = starsFor(state.heroHp);
    return [defeated, { state: { ...defeated.state, phase: "won", stars }, event: { type: "won", stars } }];
  }
  const wave = waveStep({ ...defeated.state, turn: 0 }, nextWave);
  return [defeated, wave, dealStep(wave.state)];
};

const strike = (state: BattleState, enemy: Enemy, total: number, power: number): Step[] => {
  const distance = Math.abs(total - enemy.weakness);
  const exact = distance === 0;
  const damage = exact ? (STRIKE_DAMAGE[Math.min(power, 5)] ?? 0) : distance === 1 ? NEAR_MISS_DAMAGE : 0;
  const hit = updateEnemy(state, enemy.id, (e) => ({ ...e, hp: Math.max(0, e.hp - damage) }));
  const struck: Step = { state: hit, event: { type: "strike", enemyId: enemy.id, damage, exact, power } };

  const survived = enemy.hp - damage > 0;
  if (!exact || !survived) return [struck, ...settle(hit, enemy.id)];

  const [weakness, seed] = withRng(hit, (rng) => rollWeakness(rng, hit.level, enemy.weakness));
  const shifted = updateEnemy({ ...hit, seed }, enemy.id, (e) => ({ ...e, weakness }));
  return [struck, { state: shifted, event: { type: "weaknessShift", enemyId: enemy.id } }];
};

const parry = (state: BattleState, enemy: Enemy, total: number, power: number): Step[] => {
  const { damage, remaining } = enemy.intent;
  const exact = total === damage;
  if (exact) {
    const counter = COUNTER_PER_POWER * power;
    const others = living(state).filter((other) => other.id !== enemy.id);
    const [intent, seed] = withRng(state, (rng) => rollIntent(rng, state.level, others, 0));
    const next = updateEnemy({ ...state, seed }, enemy.id, (e) => ({
      ...e,
      hp: Math.max(0, e.hp - counter),
      intent,
      rage: 0,
    }));
    return [
      { state: next, event: { type: "parry", enemyId: enemy.id, exact, blocked: remaining, counter } },
      ...settle(next, enemy.id),
    ];
  }
  // A near miss softens the blow but never by more than half: only an exact answer stops it.
  const floor = Math.ceil(damage / 2);
  const softened = Math.min(remaining, Math.max(floor, Math.min(damage, Math.abs(total - damage))));
  const next = updateEnemy(state, enemy.id, (e) => ({ ...e, intent: { ...e.intent, remaining: softened } }));
  return [
    { state: next, event: { type: "parry", enemyId: enemy.id, exact, blocked: remaining - softened, counter: 0 } },
  ];
};

const lastState = (steps: readonly Step[], fallback: BattleState) => steps.at(-1)?.state ?? fallback;

const enemyPhase = (state: BattleState): Step[] => {
  const steps = living(state).reduce<Step[]>((acc, { id }) => {
    const current = lastState(acc, state);
    if (current.phase !== "player") return acc;
    const enemy = current.enemies.find((candidate) => candidate.id === id);
    if (!enemy) return acc;
    const turns = enemy.intent.turns - 1;
    if (turns > 0) {
      return [
        ...acc,
        { state: updateEnemy(current, id, (e) => ({ ...e, intent: { ...e.intent, turns } })), event: null },
      ];
    }
    const damage = enemy.intent.remaining;
    const heroHp = Math.max(0, current.heroHp - damage);
    const others = living(current).filter((other) => other.id !== id);
    const ignored = damage === enemy.intent.damage;
    const rage = ignored ? Math.min(MAX_RAGE, enemy.rage + 1) : enemy.rage;
    const [intent, seed] = withRng(current, (rng) => rollIntent(rng, current.level, others, rage));
    const after = updateEnemy({ ...current, seed, heroHp }, id, (e) => ({ ...e, intent, rage }));
    const attack: Step = { state: after, event: { type: "enemyAttack", enemyId: id, damage } };
    if (heroHp > 0) return [...acc, attack];
    return [...acc, attack, { state: { ...after, phase: "lost" }, event: { type: "lost" } }];
  }, []);
  const end = lastState(steps, state);
  return end.phase === "player" ? [...steps, dealStep(end)] : steps;
};

const endTurn = (state: BattleState): Step[] => {
  const cleared = clear(state);
  return [...cleared, ...enemyPhase(lastState(cleared, state))];
};

const cast = (state: BattleState): Step[] => {
  const totals = runningTotals(state);
  const total = totals.at(-1);
  if (total === undefined || state.equation.tiles.length < 2) return reject(state, "tooShort");
  const enemy = living(state).find((candidate) => candidate.id === state.aim?.enemyId);
  if (!enemy || !state.aim) return reject(state, "noAim");

  const spent: BattleState = { ...state, equation: EMPTY_EQUATION, hintPath: null };
  const power = equationPower(totals);
  const steps = state.aim.kind === "strike" ? strike(spent, enemy, total, power) : parry(spent, enemy, total, power);

  const end = lastState(steps, spent);
  const tilesLeft = end.hand.filter((tile) => !tile.used).length;
  const waveChanged = end.wave !== state.wave;
  if (end.phase !== "player" || waveChanged || tilesLeft >= 2) return steps;
  return [...steps, ...enemyPhase(end)];
};

const hint = (state: BattleState): Step[] => {
  if (state.hints <= 0) return reject(state, "noHints");
  const target = aimTarget(state);
  if (target === null) return reject(state, "noAim");

  const values = state.hand.map((tile) => tile.value);
  const indexOf = (tileId: number) => state.hand.findIndex((tile) => tile.id === tileId);
  const placed = state.equation.tiles.map(indexOf);
  const spentElsewhere = state.hand.flatMap((tile, index) => (tile.used && !placed.includes(index) ? [index] : []));
  const prefix = { tiles: placed, ops: state.equation.ops };

  const continued =
    placed.length > 0 ? solve(values, state.level.ops, target, { prefix, exclude: spentElsewhere }) : null;
  const fresh = continued ?? solve(values, state.level.ops, target, { exclude: spentElsewhere });
  if (!fresh) return reject(state, "noExact");

  // If what is on the board cannot lead to the answer, the hint starts the equation over.
  const base = continued ? state : (clear(state).at(-1)?.state ?? state);
  const path: Solution = { tiles: fresh.tiles.map((index) => state.hand[index]?.id ?? -1), ops: fresh.ops };
  return quiet({ ...base, hints: state.hints - 1, hintPath: path });
};

/** The tile (and operator) the active hint wants next, if the equation is still on its path. */
export const hintNext = (state: BattleState): { tileId: number; op: Op | null } | null => {
  const path = state.hintPath;
  if (!path) return null;
  const placed = state.equation.tiles;
  const onPath = placed.every((id, index) => path.tiles[index] === id);
  const tileId = path.tiles[placed.length];
  if (!onPath || tileId === undefined) return null;
  const op = placed.length === 0 ? null : (path.ops[placed.length - 1] ?? null);
  return { tileId, op };
};

export const reduce = (state: BattleState, action: Action): Step[] => {
  if (state.phase !== "player") return [];
  switch (action.type) {
    case "tapTile":
      return tapTile(state, action.tileId);
    case "tapOp":
      return state.equation.tiles.length === 0 || !state.level.ops.includes(action.op)
        ? []
        : quiet({ ...state, equation: { ...state.equation, pendingOp: action.op } });
    case "undo":
      return undo(state);
    case "clear":
      return clear(state);
    case "aim":
      return living(state).some((enemy) => enemy.id === action.aim.enemyId) ? quiet({ ...state, aim: action.aim }) : [];
    case "cast":
      return cast(state);
    case "endTurn":
      return endTurn(state);
    case "hint":
      return hint(state);
  }
};
