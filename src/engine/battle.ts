import { canPair, dealHand, dealSwap } from "./deal";
import {
  boardTotal,
  boardTotals,
  boardValues,
  clearBoard,
  EMPTY_EQUATION,
  freshTiles,
  pickOp,
  placeTile,
  sumPower,
  undoLast,
  type Board,
  type Equation,
  type Tile,
} from "./board";
import type { Op } from "./equation";
import { ENEMY_HP, type EnemyKind, type LandId, type Level, type OpFamily, type Quirk } from "./levels";
import { createRng, type Rng } from "./rng";
import { solve, type Solution } from "./solver";

export const HERO_MAX_HP = 100;
export const HINTS_PER_LEVEL = 3;
export const POTION_HEAL = 30;

/** Items earned at the campfire and carried into a battle. */
export type Kit = { scrolls: number; potions: number };
export const NO_KIT: Kit = { scrolls: 0, potions: 0 };

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
  /** What makes it play differently right now; a helmet is lost when it is knocked off. */
  quirk: Quirk | null;
  /** Exact two-number hits a helmet has taken; the second knocks it off. */
  dents: number;
  /** A boss gains a quirk the first time it drops to half health. */
  phased: boolean;
  /** Turns until a lucky monster runs away. Null for every ordinary monster. */
  flees: number | null;
};

export type AimKind = "strike" | "parry";
export type Aim = { enemyId: number; kind: AimKind };

export type { Equation, Tile } from "./board";

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
  nextId: number;
  stars: number;
};

export type BattleEvent =
  | { type: "waveStart"; wave: number }
  | { type: "deal" }
  | {
      type: "strike";
      enemyId: number;
      damage: number;
      exact: boolean;
      power: number;
      /** What an exact hit did to a helmet, if the monster wore one. */
      helmet?: "dent" | "off";
    }
  | { type: "bossPhase"; enemyId: number; quirk: Quirk }
  | { type: "fled"; enemyId: number }
  | { type: "caught"; enemyId: number }
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
        | "alreadyCalled"
        | "bannedSign";
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

const HELMET_DENTS = 2;
/** A helmet comes straight off for a sum of this many numbers or more. */
const HELMET_BREAKER = 3;
const LUCKY_ODDS = 6;
const LUCKY_STAYS = 3;
const LUCKY_ROOM = 2;
/** The quirk each land's boss takes on at half health. */
const PHASE_QUIRK: Record<LandId, Quirk> = {
  add: "helmet",
  sub: "noPlus",
  mul: "noPlus",
  div: "helmet",
  big: "helmet",
  frac: "helmet",
};

const living = (state: BattleState) => state.enemies.filter((enemy) => enemy.hp > 0);

export const isLucky = (enemy: Enemy) => enemy.flees !== null;

/** The monsters that have to be beaten to clear the wave; a lucky one is a bonus and never holds it up. */
const fighters = (state: BattleState) => living(state).filter((enemy) => !isLucky(enemy));

/** The sign a monster will not be struck with. Blocking its attack is never restricted. */
export const bannedOp = (enemy: Enemy | undefined, kind: AimKind): Op | null =>
  kind === "strike" && enemy?.quirk === "noPlus" ? "+" : null;

const aimedEnemy = (state: BattleState) => state.enemies.find((candidate) => candidate.id === state.aim?.enemyId);

/** The sign that cannot be used on what is aimed at right now, if any. */
export const bannedNow = (state: BattleState): Op | null =>
  state.aim ? bannedOp(aimedEnemy(state), state.aim.kind) : null;

/** The signs that may be used on what is aimed at: the single source for building, hints and answer searches. */
export const opsFor = (state: BattleState): readonly Op[] => {
  const banned = bannedNow(state);
  return banned ? state.level.ops.filter((op) => op !== banned) : state.level.ops;
};

const boardRules = (state: BattleState) => ({ ops: opsFor(state), grain: state.level.grain });

export const lastState = (steps: readonly Step[], fallback: BattleState) => steps.at(-1)?.state ?? fallback;

/** Runs each phase on the state the steps so far ended in, and joins all their steps. */
const chain = (state: BattleState, ...phases: readonly ((current: BattleState) => Step[])[]): Step[] =>
  phases.reduce<Step[]>((steps, phase) => [...steps, ...phase(lastState(steps, state))], []);

export const equationValues = (state: BattleState): number[] => boardValues(state);

export const runningTotals = (state: BattleState): number[] => boardTotals(state, state.level.grain);

export const equationTotal = (state: BattleState): number | null => boardTotal(state, state.level.grain);

/** The number an aim of this kind at this enemy has to make. */
export const targetOf = (enemy: Enemy, kind: AimKind): number =>
  kind === "strike" ? enemy.weakness : enemy.intent.damage;

export const aimTarget = (state: BattleState): number | null => {
  const enemy = state.enemies.find((candidate) => candidate.id === state.aim?.enemyId);
  return enemy && state.aim ? targetOf(enemy, state.aim.kind) : null;
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

/** A monster that hates a sign only ever gets a weakness two tiles can make without it. */
const rollWeakness = (rng: Rng, level: Level, options: { avoid?: number; quirk?: Quirk | null } = {}): number => {
  const fresh = level.weakness.filter((value) => value !== options.avoid);
  const banned = options.quirk === "noPlus" ? "+" : undefined;
  const makeable = banned ? fresh.filter((value) => canPair(level, value, banned)) : fresh;
  return rng.pick(makeable.length > 0 ? makeable : fresh);
};

const defaultAim = (state: BattleState): Aim | null => {
  const aimed = living(state).find((enemy) => enemy.id === state.aim?.enemyId);
  if (aimed && state.aim) return state.aim;
  const first = fighters(state)[0] ?? living(state)[0];
  return first ? { enemyId: first.id, kind: "strike" } : null;
};

const dealStep = (state: BattleState): Step => {
  const aim = defaultAim(state);
  const strikeEnemy = living(state).find((enemy) => enemy.id === aim?.enemyId) ?? living(state)[0];
  const landing = living(state)
    .filter((enemy) => enemy.intent.turns === 1 && enemy.intent.remaining > 0)
    .map((enemy) => enemy.intent.damage);
  const [values, seed] = withRng(state, (rng) =>
    dealHand(
      rng,
      state.level,
      strikeEnemy?.weakness ?? state.level.weakness[0] ?? 2,
      landing,
      bannedOp(strikeEnemy, "strike") ?? undefined,
    ),
  );
  const hand = freshTiles(values, state.nextId);
  return {
    state: {
      ...state,
      seed,
      hand,
      nextId: state.nextId + hand.length,
      equation: EMPTY_EQUATION,
      hintPath: null,
      called: false,
      aim,
      turn: state.turn + 1,
    },
    event: { type: "deal" },
  };
};

/**
 * Now and then a golden monster joins a small wave. It never attacks and never holds the wave
 * up; beating it before it runs is a bonus. It is rolled from its own stream, so whether one
 * turns up changes nothing else about the battle.
 */
const luckyVisitor = (state: BattleState, id: number): Enemy | null => {
  const specs = state.level.waves[state.wave] ?? [];
  const first = specs[0];
  const roomy = specs.length <= LUCKY_ROOM && !specs.some((spec) => spec.kind === "boss");
  if (!first || !roomy || state.level.step === 0) return null;
  const rng = createRng((state.seed ^ 0x51ed270b ^ state.wave) >>> 0);
  if (rng.int(1, LUCKY_ODDS) !== 1) return null;
  return {
    id,
    kind: "minion",
    family: first.family,
    hp: ENEMY_HP.minion,
    maxHp: ENEMY_HP.minion,
    weakness: rollWeakness(rng, state.level),
    // It has no attack; this stands in so nothing that reads an intent has to special-case it.
    intent: { damage: 0, remaining: 0, turns: Infinity },
    rage: 0,
    quirk: null,
    dents: 0,
    phased: false,
    flees: LUCKY_STAYS,
  };
};

const waveStep = (state: BattleState, wave: number): Step => {
  const specs = state.level.waves[wave] ?? [];
  const [regulars, seed] = withRng(state, (rng) =>
    specs.map((spec, index): Enemy => {
      const damage = rng.pick(state.level.attack);
      return {
        id: state.nextId + index,
        kind: spec.kind,
        family: spec.family,
        hp: ENEMY_HP[spec.kind],
        maxHp: ENEMY_HP[spec.kind],
        weakness: rollWeakness(rng, state.level, { quirk: spec.quirk }),
        // Staggered so nothing lands on the first turn of a wave and at most two land together.
        intent: { damage, remaining: damage, turns: 2 + (index % 2) },
        rage: 0,
        quirk: spec.quirk ?? null,
        dents: 0,
        phased: false,
        flees: null,
      };
    }),
  );
  const lucky = luckyVisitor({ ...state, wave }, state.nextId + regulars.length);
  const enemies = lucky ? [...regulars, lucky] : regulars;
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
    nextId: 1,
    stars: 0,
  };
  return openWave(blank, 0);
};

const reject = (state: BattleState, reason: Extract<BattleEvent, { type: "rejected" }>["reason"]): Step[] => [
  { state, event: { type: "rejected", reason } },
];

const quiet = (state: BattleState): Step[] => [{ state, event: null }];

/** A change to the sum being built: nothing happened, it was refused, or the board moved on. */
const onBoard = (state: BattleState, next: Board | "needOperator" | "badStep" | null): Step[] => {
  if (next === null) return [];
  return typeof next === "string" ? reject(state, next) : quiet({ ...state, ...next });
};

const clear = (state: BattleState): Step[] => onBoard(state, clearBoard(state));

const without = (state: BattleState, enemyId: number): BattleState => ({
  ...state,
  enemies: state.enemies.filter((enemy) => enemy.id !== enemyId),
});

/** Any lucky monster still about when the wave is won runs for it. */
const scatter = (state: BattleState): Step[] =>
  living(state)
    .filter(isLucky)
    .reduce<Step[]>((steps, { id }) => {
      const gone = without(lastState(steps, state), id);
      return [...steps, { state: gone, event: { type: "fled", enemyId: id } }];
    }, []);

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
  const prize: Step[] = isLucky(enemy) ? [{ state: defeated.state, event: { type: "caught", enemyId } }] : [];
  if (fighters(state).length > 0) return [defeated, ...prize];

  const fled = scatter(defeated.state);
  const cleared = lastState(fled, defeated.state);
  const before = [defeated, ...prize, ...fled];
  const nextWave = state.wave + 1;
  if (nextWave >= state.level.waves.length) {
    const stars = starsFor(state.heroHp);
    return [...before, { state: { ...cleared, phase: "won", stars }, event: { type: "won", stars } }];
  }
  return [...before, ...openWave({ ...cleared, turn: 0 }, nextWave)];
};

/** One step off the number: one away, or a half or a quarter away where the land counts in those. */
export const isNearMiss = (distance: number, level: Level) => distance === (level.grain ?? 1);

const strikeDamage = (distance: number, power: number, level: Level): number => {
  if (distance === 0) return STRIKE_DAMAGE[Math.min(power, 5)] ?? 0;
  return isNearMiss(distance, level) ? NEAR_MISS_DAMAGE : 0;
};

/**
 * What an exact hit does to a helmet. Two numbers only dent it, and the second dent knocks it
 * off, so short sums still get through, just more slowly. Three or more knock it off at once.
 */
const helmetHit = (enemy: Enemy, exact: boolean, power: number): "dent" | "off" | "holds" | null => {
  if (enemy.quirk !== "helmet") return null;
  if (!exact) return "holds";
  return power >= HELMET_BREAKER || enemy.dents + 1 >= HELMET_DENTS ? "off" : "dent";
};

/** A boss that has just dropped to half health takes on its land's quirk, with a weakness that suits it. */
const bossPhase = (state: BattleState, enemyId: number): Step[] => {
  const enemy = state.enemies.find((candidate) => candidate.id === enemyId);
  const halfway = enemy && enemy.hp > 0 && enemy.hp <= enemy.maxHp / 2;
  if (!enemy || enemy.kind !== "boss" || enemy.phased || !halfway) return [];
  const quirk = PHASE_QUIRK[state.level.region];
  const [weakness, seed] = withRng(state, (rng) => rollWeakness(rng, state.level, { avoid: enemy.weakness, quirk }));
  const next = updateEnemy({ ...state, seed }, enemyId, (e) => ({ ...e, quirk, dents: 0, phased: true, weakness }));
  return [{ state: next, event: { type: "bossPhase", enemyId, quirk } }];
};

const strike = (state: BattleState, enemy: Enemy, total: number, power: number): Step[] => {
  const distance = Math.abs(total - enemy.weakness);
  const exact = distance === 0;
  const helmet = helmetHit(enemy, exact, power);
  // A helmet stops everything except the sum that knocks it off with three numbers or more.
  const blocked = helmet !== null && !(helmet === "off" && power >= HELMET_BREAKER);
  const damage = blocked ? 0 : strikeDamage(distance, power, state.level);
  const hit = updateEnemy(state, enemy.id, (e) => ({
    ...e,
    hp: Math.max(0, e.hp - damage),
    quirk: helmet === "off" ? null : e.quirk,
    dents: helmet === "dent" ? e.dents + 1 : e.dents,
  }));
  const dealt = helmet === "dent" || helmet === "off" ? { helmet } : {};
  const struck: Step = { state: hit, event: { type: "strike", enemyId: enemy.id, damage, exact, power, ...dealt } };

  const survived = enemy.hp - damage > 0;
  if (!exact || !survived) return [struck, ...settle(hit, enemy.id)];

  const phase = bossPhase(hit, enemy.id);
  if (phase.length > 0) return [struck, ...phase];
  const quirk = helmet === "off" ? null : enemy.quirk;
  const [weakness, seed] = withRng(hit, (rng) => rollWeakness(rng, hit.level, { avoid: enemy.weakness, quirk }));
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
    ...bossPhase(next, enemy.id),
  ];
};

/** A near miss softens the blow but never by more than half: only an exact answer stops it. */
const softenedBlow = ({ damage, remaining }: Intent, total: number): number => {
  const floor = Math.ceil(damage / 2);
  // Rounded up, so an answer with a half in it never leaves half a point of health.
  return Math.min(remaining, Math.max(floor, Math.min(damage, Math.ceil(Math.abs(total - damage)))));
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
  if (enemy.flees !== null) {
    const flees = enemy.flees - 1;
    if (flees > 0) return quiet(updateEnemy(state, enemyId, (e) => ({ ...e, flees })));
    const gone = without(state, enemyId);
    return [{ state: { ...gone, aim: defaultAim(gone) }, event: { type: "fled", enemyId } }];
  }
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
  const banned = bannedNow(state);
  if (banned && state.equation.ops.includes(banned)) return reject(state, "bannedSign");

  const wasted = total !== targetOf(enemy, state.aim.kind);
  const hand = wasted
    ? state.hand.map((tile) => (state.equation.tiles.includes(tile.id) ? { ...tile, wasted } : tile))
    : state.hand;
  const spent: BattleState = { ...state, hand, equation: EMPTY_EQUATION, hintPath: null };
  const power = sumPower(totals);
  const steps = state.aim.kind === "strike" ? strike(spent, enemy, total, power) : parry(spent, enemy, total, power);

  const end = lastState(steps, spent);
  const tilesLeft = end.hand.filter((tile) => !tile.used).length;
  const waveChanged = end.wave !== state.wave;
  if (end.phase !== "player" || waveChanged || tilesLeft >= 2) return steps;
  return [...steps, ...enemyPhase(end)];
};

/** Hand positions of tiles spent on earlier casts this turn; tiles sitting in the equation are not spent yet. */
const spentTiles = (state: BattleState, options: { wastedCount?: boolean } = {}): number[] =>
  state.hand.flatMap((tile, index) => {
    const spent = tile.used && !state.equation.tiles.includes(tile.id);
    return spent && !(options.wastedCount && tile.wasted) ? [index] : [];
  });

const searchAnswer = (state: BattleState, target: number, options: { prefix?: Solution; exclude: number[] }) =>
  solve(
    state.hand.map((tile) => tile.value),
    opsFor(state),
    target,
    { ...options, grain: state.level.grain },
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
  const wellSpent = spentTiles(state, { wastedCount: true });
  return target !== null && searchAnswer(state, target, { exclude: wellSpent }) !== null;
};

const hint = (state: BattleState): Step[] => {
  if (state.hints <= 0) return reject(state, "noHints");
  const target = aimTarget(state);
  if (target === null) return reject(state, "noAim");

  const placed = state.equation.tiles.map((tileId) => state.hand.findIndex((tile) => tile.id === tileId));
  const exclude = spentTiles(state);
  const prefix = { tiles: placed, ops: state.equation.ops };
  // A sum that already uses a sign the monster hates cannot be finished; the hint starts over.
  const usable = placed.length > 0 && state.equation.ops.every((op) => opsFor(state).includes(op));
  const continued = usable ? searchAnswer(state, target, { prefix, exclude }) : null;
  const fresh = continued ?? searchAnswer(state, target, { exclude });
  if (!fresh) return reject(state, "noExact");

  // If what is on the board cannot lead to the answer, the hint starts the equation over.
  const base = continued ? state : lastState(clear(state), state);
  const tiles = fresh.tiles.flatMap((index) => state.hand[index]?.id ?? []);
  const path: Solution = { tiles, ops: fresh.ops };
  return quiet({ ...base, hints: state.hints - 1, hintPath: path });
};

/** Hand positions of the tiles still free to use. */
const unspentPlaces = (state: BattleState): number[] => state.hand.flatMap((tile, index) => (tile.used ? [] : [index]));

/**
 * Trades every unspent tile for a new one that can help make `target`. New tiles take the places
 * of the ones traded in, so the spent ones do not jump about.
 */
const swapUnspent = (state: BattleState, target: number): BattleState => {
  const places = unspentPlaces(state);
  const [values, seed] = withRng(state, (rng) =>
    dealSwap(rng, state.level, target, places.length, bannedNow(state) ?? undefined),
  );
  const fresh = new Map(
    places.map((place, order): [number, Tile] => [
      place,
      { id: state.nextId + order, value: values[order] ?? 1, used: false },
    ]),
  );
  const hand = state.hand.map((tile, index) => fresh.get(index) ?? tile);
  return { ...state, seed, hand, nextId: state.nextId + places.length };
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
  const swapped = unspentPlaces(called).length;
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

/** Anything alive can be struck; a lucky monster has no attack to block. */
const aimable = (state: BattleState, aim: Aim): boolean => {
  const enemy = living(state).find((candidate) => candidate.id === aim.enemyId);
  return enemy !== undefined && !(aim.kind === "parry" && isLucky(enemy));
};

export const reduce = (state: BattleState, action: Action): Step[] => {
  if (state.phase !== "player") return [];
  switch (action.type) {
    case "tapTile":
      return onBoard(state, placeTile(state, action.tileId, boardRules(state)));
    case "tapOp":
      return action.op === bannedNow(state)
        ? reject(state, "bannedSign")
        : onBoard(state, pickOp(state, action.op, boardRules(state)));
    case "undo":
      return onBoard(state, undoLast(state));
    case "clear":
      return clear(state);
    case "aim":
      return aimable(state, action.aim) ? quiet({ ...state, aim: action.aim }) : [];
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
