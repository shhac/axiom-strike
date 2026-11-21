import { signal } from "@preact/signals";
import { createBattle, reduce, type Action, type BattleState, type Step } from "../engine/battle";
import { findLevel } from "../engine/levels";
import { playMusic } from "./audio";
import { afterEvent, beforeEvent, heroPose } from "./fx";
import { saveWin } from "./save";

const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

const opening = (levelId: string | null, seed: number) => createBattle(findLevel(levelId), seed);

/** What is on screen. It trails the engine while animations play, one step at a time. */
export const battle = signal<BattleState>(opening(null, 1)[0]!.state);
export const busy = signal(false);

const play = async (steps: readonly Step[]) => {
  busy.value = true;
  for (const step of steps) {
    if (step.event) await beforeEvent(step.event);
    battle.value = step.state;
    if (step.event?.type === "won") saveWin(step.state.level, step.event.stars);
    if (step.event) await afterEvent(step.event, step.state);
  }
  busy.value = false;
};

export const dispatch = (action: Action) => {
  if (busy.value) return;
  const steps = reduce(battle.value, action);
  if (steps.length === 0) return;
  const instant = steps.every((step) => step.event === null);
  if (!instant) return void play(steps);
  battle.value = steps.at(-1)!.state;
};

export const startBattle = (levelId: string | null, seed = randomSeed()) => {
  if (busy.value) return;
  const steps = opening(levelId, seed);
  heroPose.value = "idle";
  playMusic("music_battle");
  battle.value = steps[0]!.state;
  void play(steps);
};
