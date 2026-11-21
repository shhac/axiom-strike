import { dealHand, pairFor } from "./deal";
import { applyStep, type Op } from "./equation";
import { ENEMY_HP, type EnemyKind, type Level, type OpFamily } from "./levels";
import { createRng, type Rng } from "./rng";
import { solve, type Solution } from "./solver";

export const HERO_MAX_HP = 100;
export const HINTS_PER_LEVEL = 3;
export const POTION_HEAL = 30;

/** Items earned at the campfire and carried into a battle. */
export type Kit = { scrolls: number; potions: number };
export const NO_KIT: Kit = { scrolls: 0, potions: 0 };

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
  potions: number;
  hintPath: Solution | null;
  /** Whether "Impossible!" has been called this turn; one call a turn, right or wrong. */
  called: boolean;
  /** Tiles thrown away this turn on answers that were not exact. They still count against a call. */
  misspent: number[];
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
  | { type: "healed"; amount: number }
  | { type: "sharpEye"; swapped: number }
  | { type: "lookAgain" }
  | { type: "won"; stars: number }
  | { type: "lost" }
  | {
      type: "rejected";
      reason:
        | "needOperator"
        | "badStep"
        | "tooShort"
        | "noAim"
        | "noHints"
        | "noExact"
        | "noPotions"
        | "fullHealth"
        | "alreadyCalled";
    };

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
  | { type: "hint" }
  | { type: "potion" }
  | { type: "impossible" };

export const STRIKE_DAMAGE = [0, 0, 20, 35, 55, 80] as const;
const COUNTER_PER_POWER = 5;
/** One away still scratches; anything further misses, so guessing gets nowhere. */
const NEAR_MISS_DAMAGE = 1;
/** The deal can only promise exact parries for this many attacks in one turn. */
const MAX_LANDING_TOGETHER = 2;
const RAGE_STEP = 2;
const MAX_RAGE = 3;

const EMPTY_EQUATION: Equation = { tiles: [], ops: [], pendingOp: null };

const living = (state: BattleState) => state.enemies.filter((enemy) => enemy.hp > 0);

export const lastState = (steps: readonly Step[], fallback: BattleState) => steps.at(-1)?.state ?? fallback;

/** Runs each phase on the state the steps so far ended in, and joins all their steps. */
const chain = (state: BattleState, ...phases: readonly ((current: BattleState) => Step[])[]): Step[] =>
  phases.reduce<Step[]>((steps, phase) => [...steps, ...phase(lastState(steps, state))], []);

/** The numbers placed in the equation so far, in order. */
export const equationValues = (state: BattleState): number[] =>
  state.equation.tiles.map((id) => state.hand.find((tile) => tile.id === id)?.value ?? 0);

/** Running totals after each tile of the equation; empty if nothing is placed. */
export const runningTotals = (state: BattleState): number[] =>
  equationValues(state).reduce<number[]>((totals, value, index) => {
    if (index === 0) return [value];
    const op = state.equation.ops[index - 1];
    const previous = totals[totals.length - 1];
    if (op === undefined || previous === undefined) return totals;
    return [...totals, applyStep(previous, { op, value }) ?? previous];
  }, []);

export const equationTotal = (state: BattleState): number | null => runningTotals(state).at(-1) ?? null;

const MIN_POWER = 2;

/**
 * How many tiles it really took to reach the final total. `3 + 4 + 5 - 5` is still a two-tile
 * seven, so adding a number and taking it away again earns nothing. It never drops below two:
 * `6 × 1` is padding too, but it is still a right answer and hits like one.
 */
const equationPower = (totals: readonly number[]): number => {
  const final = totals.at(-1);
  return final === undefined ? 0 : Math.max(MIN_POWER, totals.indexOf(final) + 1);
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

const rollIntent = (rng: Rng, level: Level, others: readonly Enemy[], rage: number): Intent => {
  // Ignored attacks get bigger, but never beyond what two added tiles can still answer.
  const ceiling = level.tileMax * 2 - 1;
  const base = rng.pick(level.attack);
  const damage = level.rage ? Math.max(base, Math.min(ceiling, base + RAGE_STEP * rage)) : base;
  return { damage, remaining: damage, turns: rollTurns(others) };
};

const rerollIntent = (state: BattleState, enemyId: number, rage: number): [Intent, number] => {
  const others = living(state).filter((other) => other.id !== enemyId);
  return withRng(state, (rng) => rollIntent(rng, state.level, others, rage));
};

const rollWeakness = (rng: Rng, level: Level, avoid?: number): number =>
  rng.pick(level.weakness.filter((value) => value !== avoid));

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
    dealHand(rng, state.level, strikeEnemy?.weakness ?? state.level.weakness[0] ?? 2, landing),
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
      called: false,
      misspent: [],
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
      const damage = rng.pick(state.level.attack);
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

const openWave = (state: BattleState, wave: number): [Step, Step] => {
  const arrival = waveStep(state, wave);
  return [arrival, dealStep(arrival.state)];
};

/** Always two steps: the first wave arriving, then the first hand being dealt. */
export const createBattle = (level: Level, seed: number, kit: Kit = NO_KIT): readonly [Step, Step] => {
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
    hints: HINTS_PER_LEVEL + kit.scrolls,
    potions: kit.potions,
    hintPath: null,
    called: false,
    misspent: [],
    nextId: 1,
    stars: 0,
  };
  return openWave(blank, 0);
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

const starsFor = (heroHp: number) => {
  if (heroHp >= HERO_MAX_HP * 0.7) return 3;
  if (heroHp >= HERO_MAX_HP * 0.35) return 2;
  return 1;
};

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
  return [defeated, ...openWave({ ...defeated.state, turn: 0 }, nextWave)];
};

const strikeDamage = (distance: number, power: number): number => {
  if (distance === 0) return STRIKE_DAMAGE[Math.min(power, 5)] ?? 0;
  return distance === 1 ? NEAR_MISS_DAMAGE : 0;
};

const strike = (state: BattleState, enemy: Enemy, total: number, power: number): Step[] => {
  const distance = Math.abs(total - enemy.weakness);
  const exact = distance === 0;
  const damage = strikeDamage(distance, power);
  const hit = updateEnemy(state, enemy.id, (e) => ({ ...e, hp: Math.max(0, e.hp - damage) }));
  const struck: Step = { state: hit, event: { type: "strike", enemyId: enemy.id, damage, exact, power } };

  const survived = enemy.hp - damage > 0;
  if (!exact || !survived) return [struck, ...settle(hit, enemy.id)];

  const [weakness, seed] = withRng(hit, (rng) => rollWeakness(rng, hit.level, enemy.weakness));
  const shifted = updateEnemy({ ...hit, seed }, enemy.id, (e) => ({ ...e, weakness }));
  return [struck, { state: shifted, event: { type: "weaknessShift", enemyId: enemy.id } }];
};

const exactParry = (state: BattleState, enemy: Enemy, power: number): Step[] => {
  const counter = COUNTER_PER_POWER * power;
  const [intent, seed] = rerollIntent(state, enemy.id, 0);
  const next = updateEnemy({ ...state, seed }, enemy.id, (e) => ({
    ...e,
    hp: Math.max(0, e.hp - counter),
    intent,
    rage: 0,
  }));
  return [
    { state: next, event: { type: "parry", enemyId: enemy.id, exact: true, blocked: enemy.intent.remaining, counter } },
    ...settle(next, enemy.id),
  ];
};

/** A near miss softens the blow but never by more than half: only an exact answer stops it. */
const softenedBlow = ({ damage, remaining }: Intent, total: number): number => {
  const floor = Math.ceil(damage / 2);
  return Math.min(remaining, Math.max(floor, Math.min(damage, Math.abs(total - damage))));
};

const nearParry = (state: BattleState, enemy: Enemy, total: number): Step[] => {
  const softened = softenedBlow(enemy.intent, total);
  const blocked = enemy.intent.remaining - softened;
  const next = updateEnemy(state, enemy.id, (e) => ({ ...e, intent: { ...e.intent, remaining: softened } }));
  return [{ state: next, event: { type: "parry", enemyId: enemy.id, exact: false, blocked, counter: 0 } }];
};

const parry = (state: BattleState, enemy: Enemy, total: number, power: number): Step[] =>
  total === enemy.intent.damage ? exactParry(state, enemy, power) : nearParry(state, enemy, total);

const enemyTurn = (state: BattleState, enemyId: number): Step[] => {
  if (state.phase !== "player") return [];
  const enemy = state.enemies.find((candidate) => candidate.id === enemyId);
  if (!enemy) return [];
  const turns = enemy.intent.turns - 1;
  if (turns > 0) return quiet(updateEnemy(state, enemyId, (e) => ({ ...e, intent: { ...e.intent, turns } })));

  const damage = enemy.intent.remaining;
  const heroHp = Math.max(0, state.heroHp - damage);
  const ignored = damage === enemy.intent.damage;
  const rage = ignored ? Math.min(MAX_RAGE, enemy.rage + 1) : enemy.rage;
  const [intent, seed] = rerollIntent(state, enemyId, rage);
  const after = updateEnemy({ ...state, seed, heroHp }, enemyId, (e) => ({ ...e, intent, rage }));
  const attack: Step = { state: after, event: { type: "enemyAttack", enemyId, damage } };
  if (heroHp > 0) return [attack];
  return [attack, { state: { ...after, phase: "lost" }, event: { type: "lost" } }];
};

/** Every enemy alive when the phase starts takes its turn in order, then a new hand is dealt. */
const enemyPhase = (state: BattleState): Step[] =>
  chain(
    state,
    ...living(state).map(
      ({ id }) =>
        (current: BattleState) =>
          enemyTurn(current, id),
    ),
    (end) => (end.phase === "player" ? [dealStep(end)] : []),
  );

const endTurn = (state: BattleState): Step[] => chain(state, clear, enemyPhase);

const cast = (state: BattleState): Step[] => {
  const totals = runningTotals(state);
  const total = totals.at(-1);
  if (total === undefined || state.equation.tiles.length < 2) return reject(state, "tooShort");
  const enemy = living(state).find((candidate) => candidate.id === state.aim?.enemyId);
  if (!enemy || !state.aim) return reject(state, "noAim");

  const target = state.aim.kind === "strike" ? enemy.weakness : enemy.intent.damage;
  const misspent = total === target ? state.misspent : [...state.misspent, ...state.equation.tiles];
  const spent: BattleState = { ...state, equation: EMPTY_EQUATION, hintPath: null, misspent };
  const power = equationPower(totals);
  const steps = state.aim.kind === "strike" ? strike(spent, enemy, total, power) : parry(spent, enemy, total, power);

  const end = lastState(steps, spent);
  const tilesLeft = end.hand.filter((tile) => !tile.used).length;
  const waveChanged = end.wave !== state.wave;
  if (end.phase !== "player" || waveChanged || tilesLeft >= 2) return steps;
  return [...steps, ...enemyPhase(end)];
};

/** Hand positions of tiles spent on earlier casts this turn; tiles sitting in the equation are not spent yet. */
const spentTiles = (state: BattleState): number[] =>
  state.hand.flatMap((tile, index) => (tile.used && !state.equation.tiles.includes(tile.id) ? [index] : []));

const searchAnswer = (state: BattleState, target: number, options: { prefix?: Solution; exclude: number[] }) =>
  solve(
    state.hand.map((tile) => tile.value),
    state.level.ops,
    target,
    options,
  );

/** An exact answer for the aimed number from the tiles not yet spent this turn, if there is one. */
export const answerLeft = (state: BattleState): Solution | null => {
  const target = aimTarget(state);
  return target === null ? null : searchAnswer(state, target, { exclude: spentTiles(state) });
};

/**
 * Whether the aimed number was within reach this turn. Tiles thrown away on wrong answers count
 * as if they were still in hand, so wasting tiles never turns a makeable number into a right call.
 */
const wasMakeable = (state: BattleState): boolean => {
  const target = aimTarget(state);
  const wellSpent = spentTiles(state).filter((index) => !state.misspent.includes(state.hand[index]?.id ?? -1));
  return target !== null && searchAnswer(state, target, { exclude: wellSpent }) !== null;
};

const hint = (state: BattleState): Step[] => {
  if (state.hints <= 0) return reject(state, "noHints");
  const target = aimTarget(state);
  if (target === null) return reject(state, "noAim");

  const placed = state.equation.tiles.map((tileId) => state.hand.findIndex((tile) => tile.id === tileId));
  const exclude = spentTiles(state);
  const prefix = { tiles: placed, ops: state.equation.ops };
  const continued = placed.length > 0 ? searchAnswer(state, target, { prefix, exclude }) : null;
  const fresh = continued ?? searchAnswer(state, target, { exclude });
  if (!fresh) return reject(state, "noExact");

  // If what is on the board cannot lead to the answer, the hint starts the equation over.
  const base = continued ? state : lastState(clear(state), state);
  const tiles = fresh.tiles.flatMap((index) => state.hand[index]?.id ?? []);
  const path: Solution = { tiles, ops: fresh.ops };
  return quiet({ ...base, hints: state.hints - 1, hintPath: path });
};

/** Trades every unspent tile for a new one; the new ones always include an exact pair for `target`. */
const swapUnspent = (state: BattleState, target: number): BattleState => {
  const count = state.hand.filter((tile) => !tile.used).length;
  const [values, seed] = withRng(state, (rng) => {
    const pair = pairFor(rng, state.level, target) ?? [];
    const filler = Array.from({ length: Math.max(0, count - pair.length) }, () => rng.int(1, state.level.tileMax));
    return rng.shuffle([...pair, ...filler]).slice(0, count);
  });
  // New tiles take the places of the ones traded in, so the spent ones do not jump about.
  const places = state.hand.flatMap((tile, index) => (tile.used ? [] : [index]));
  const hand = state.hand.map((tile, index) => {
    const order = places.indexOf(index);
    const value = values[order];
    return order < 0 || value === undefined ? tile : { id: state.nextId + order, value, used: false };
  });
  return { ...state, seed, hand, nextId: state.nextId + count };
};

/**
 * The player says the aimed number cannot be made from the tiles left. Being right trades those
 * tiles for new ones that can make it, without the monsters getting a turn. One call a turn,
 * right or wrong, so it can neither be spammed as a free check nor chained to stall the monsters.
 */
const impossible = (state: BattleState): Step[] => {
  if (state.called) return reject(state, "alreadyCalled");
  const target = aimTarget(state);
  if (target === null) return reject(state, "noAim");

  const called: BattleState = { ...lastState(clear(state), state), called: true, hintPath: null };
  if (wasMakeable(called)) return [{ state: called, event: { type: "lookAgain" } }];
  const swapped = called.hand.filter((tile) => !tile.used).length;
  return [{ state: swapUnspent(called, target), event: { type: "sharpEye", swapped } }];
};

const potion = (state: BattleState): Step[] => {
  if (state.potions <= 0) return reject(state, "noPotions");
  if (state.heroHp >= HERO_MAX_HP) return reject(state, "fullHealth");
  const heroHp = Math.min(HERO_MAX_HP, state.heroHp + POTION_HEAL);
  return [
    {
      state: { ...state, heroHp, potions: state.potions - 1 },
      event: { type: "healed", amount: heroHp - state.heroHp },
    },
  ];
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
    case "potion":
      return potion(state);
    case "impossible":
      return impossible(state);
  }
};
