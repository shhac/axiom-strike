import { signal } from "@preact/signals";
import { createBattle, isLucky, reduce, type Action, type BattleState, type Step } from "../engine/battle";
import { FIRST_LEVEL, tuneLevel, type LandId, type Level } from "../engine/levels";
import {
  addPotion,
  bookKey,
  LUCKY_KEY,
  kitFor,
  markPlayed,
  recordBeaten,
  recordCast,
  recordLoss,
  recordWin,
  spendItems,
  starsFor,
  tierFor,
} from "../engine/progress";
import { battleDifficulty, castResult, castScore } from "../engine/skill";
import { playMusic } from "./audio";
import { petFeels } from "./petMood";
import { afterEvent, beforeEvent, heroPose, hush, showToast } from "./fx";
import { localDay, save, updateSave } from "./save";
import { randomSeed } from "./seed";

/**
 * What is on screen. It trails the engine while animations play, one step at a time. Until a
 * level is picked it holds a stand-in battle, so there is always a board to draw.
 */
export const battle = signal<BattleState>(createBattle(FIRST_LEVEL, 1)[0].state);
export const busy = signal(false);

/** The battle being played; leaving or restarting replaces it, which stops any steps still playing. */
const session: { run: number; difficulty: number } = { run: 0, difficulty: 0 };

/** Items used on screen come out of the save at once, so quitting neither refunds nor loses them. */
const show = (next: BattleState) => {
  const potionsDrunk = Math.max(0, battle.value.potions - next.potions);
  const hintUsed = next.hints < battle.value.hints;
  battle.value = next;
  if (potionsDrunk > 0 || hintUsed) updateSave((current) => spendItems(current, next.hints, potionsDrunk));
};

/** Stars just won and not yet seen flying into their land's counter on the map. */
export const freshStars = signal<{ land: LandId; levelId: string; count: number } | null>(null);

const noteFreshStars = (level: Level, stars: number) => {
  const gained = stars - starsFor(save.value, level);
  if (gained <= 0) return;
  const waiting = freshStars.value?.land === level.region ? freshStars.value.count : 0;
  freshStars.value = { land: level.region, levelId: level.id, count: waiting + gained };
};

/** The monster book's name for a beaten monster. */
const pageOf = (state: BattleState, enemyId: number): string | null => {
  const enemy = state.enemies.find((candidate) => candidate.id === enemyId);
  if (!enemy) return null;
  return isLucky(enemy) ? LUCKY_KEY : bookKey(enemy.family, enemy.kind);
};

const settle = (step: Step) => {
  const { event, state } = step;
  if (event?.type === "won") {
    noteFreshStars(state.level, event.stars);
    updateSave((current) => markPlayed(recordWin(current, state.level, event.stars), localDay()));
  }
  if (event?.type === "lost") updateSave((current) => markPlayed(recordLoss(current, state.level), localDay()));
  if (event?.type === "caught") updateSave(addPotion);
  if (event?.type === "defeated") {
    const monster = pageOf(state, event.enemyId);
    if (monster) updateSave((current) => recordBeaten(current, monster));
  }
};

const play = async (steps: readonly Step[]) => {
  const run = session.run;
  busy.value = true;
  for (const step of steps) {
    if (step.event) await beforeEvent(step.event);
    if (run !== session.run) return;
    show(step.state);
    settle(step);
    if (step.event) await afterEvent(step.event, step.state);
    if (run !== session.run) return;
  }
  busy.value = false;
};

/**
 * Casts that could have been exact move the rating. One thrown at a number the tiles could not
 * make is not held against the player; it points at the way out instead of leaving them stuck.
 */
const rateCast = (state: BattleState) => {
  const result = castResult(state);
  if (!result) {
    // A cast that landed is only unrated when no exact answer was left to find.
    if (!state.called) showToast("Stuck? If the number can't be made, tap Impossible!");
    return;
  }
  updateSave((current) => recordCast(current, state.level.region, session.difficulty, castScore(result)));
};

const landed = (steps: readonly Step[]) =>
  steps.some((step) => step.event?.type === "strike" || step.event?.type === "parry");

export const dispatch = (action: Action) => {
  if (busy.value) return;
  const before = battle.value;
  const steps = reduce(before, action);
  const last = steps.at(-1);
  if (!last) return;
  if (action.type === "cast" && landed(steps)) rateCast(before);
  const instant = steps.every((step) => step.event === null);
  if (!instant) return void play(steps);
  show(last.state);
};

export const startBattle = (level: Level, seed = randomSeed()) => {
  const tier = tierFor(save.value, level);
  const steps = createBattle(tuneLevel(level, tier), seed, kitFor(save.value));
  session.run += 1;
  hush();
  session.difficulty = battleDifficulty(level, tier);
  heroPose.value = "idle";
  petFeels("calm");
  playMusic("music_battle");
  battle.value = steps[0].state;
  void play(steps);
};

/** Walks away from the battle in progress; nothing more from it is shown or saved. */
export const leaveBattle = () => {
  session.run += 1;
  hush();
  busy.value = false;
};
