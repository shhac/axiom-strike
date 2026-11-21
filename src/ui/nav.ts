import { signal } from "@preact/signals";
import { introFor, type Intro } from "../content/intros";
import { findLevel, type Level } from "../engine/levels";
import { markSeen } from "../engine/progress";
import { playMusic } from "./audio";
import { save, updateSave } from "./save";
import { leaveBattle, startBattle } from "./store";

export type Screen = "title" | "map" | "intro" | "battle" | "campfire";

const params = new URLSearchParams(location.search);
const seedParam = Number(params.get("seed")) || undefined;
const levelParam = params.get("level");

export const screen = signal<Screen>(levelParam ? "battle" : "title");
export const settingsOpen = signal(false);

/** The scene playing before a battle, and the level it leads into. */
export const intro = signal<{ scene: Intro; level: Level } | null>(null);

const beginBattle = (level: Level) => {
  intro.value = null;
  screen.value = "battle";
  startBattle(level, seedParam);
};

/** Meets the level's monsters first if they are new, then fights. */
export const enterBattle = (level: Level) => {
  leaveBattle();
  const scene = introFor(level, save.value.seen);
  if (!scene) return beginBattle(level);
  intro.value = { scene, level };
  screen.value = "intro";
  playMusic("music_battle");
};

export const finishIntro = () => {
  const current = intro.value;
  if (!current) return;
  updateSave((progress) => markSeen(progress, current.scene.id));
  enterBattle(current.level);
};

export const goTo = (next: Exclude<Screen, "battle" | "intro">) => {
  leaveBattle();
  settingsOpen.value = false;
  screen.value = next;
};

/** `?level=` skips the title, map and intro scenes and opens straight into that battle. */
export const startFromUrl = () => {
  if (levelParam) beginBattle(findLevel(levelParam));
};
