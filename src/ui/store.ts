import { signal } from "@preact/signals";
import { createBattle, reduce, type Action, type BattleState, type Step } from "../engine/battle";
import { FIRST_LEVEL, tuneLevel, type Level } from "../engine/levels";
import { kitFor, recordCast, recordLoss, recordWin, spendItems, tierFor } from "../engine/progress";
import { battleDifficulty, castResult, castScore } from "../engine/skill";
import { playMusic } from "./audio";
import { afterEvent, beforeEvent, heroPose } from "./fx";
import { save, updateSave } from "./save";

const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

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

const settle = (step: Step) => {
  if (step.event?.type === "won") {
    const { stars } = step.event;
    updateSave((current) => recordWin(current, step.state.level, stars));
  }
  if (step.event?.type === "lost") updateSave((current) => recordLoss(current, step.state.level));
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

const rateCast = (state: BattleState) => {
  const result = castResult(state);
  if (!result) return;
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
  session.difficulty = battleDifficulty(level, tier);
  heroPose.value = "idle";
  playMusic("music_battle");
  battle.value = steps[0].state;
  void play(steps);
};

/** Walks away from the battle in progress; nothing more from it is shown or saved. */
export const leaveBattle = () => {
  session.run += 1;
  busy.value = false;
};
