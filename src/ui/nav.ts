import { signal } from "@preact/signals";
import { introFor, type Intro } from "../content/intros";
import { findLevel, findRegion, type LandId, type Level } from "../engine/levels";
import { heroSpot, markSeen, standAt } from "../engine/progress";
import { playMusic, playSfx } from "./audio";
import { wait } from "./motion";
import { save, updateSave } from "./save";
import { leaveBattle, startBattle } from "./store";

export type Screen = "title" | "map" | "intro" | "battle" | "campfire" | "lock" | "cave";

const params = new URLSearchParams(location.search);
const seedParam = Number(params.get("seed")) || undefined;
const levelParam = params.get("level");

export const screen = signal<Screen>(levelParam ? "battle" : "title");
export const settingsOpen = signal(false);

/** Which map is showing: the first four lands or the far ones. It opens on the hero's. */
export const mapPage = signal(findRegion(heroSpot(save.value)?.region ?? "add").page);

/** What is open at the camp; null is the camp itself, with a button for each. */
export type Activity = "story" | "practice" | "words" | "book" | "gear";
export const campActivity = signal<Activity | null>(null);

/** The land whose chest lock or cave is open. */
export const visiting = signal<LandId>("add");

/** The scene playing before a battle, and the level it leads into. */
export const intro = signal<{ scene: Intro; level: Level } | null>(null);

/** The curtain that sweeps across between screens: closing, then opening on the new one. */
export const curtain = signal<"closing" | "opening" | null>(null);

const CURTAIN_MS = 260;

/** Swaps the screen behind a closed curtain. Taps made while it is moving are ignored. */
const transit = async (swap: () => void) => {
  if (curtain.value) return;
  curtain.value = "closing";
  playSfx("deal", 0.5);
  await wait(CURTAIN_MS);
  swap();
  curtain.value = "opening";
  await wait(CURTAIN_MS);
  curtain.value = null;
};

const beginBattle = (level: Level) => {
  intro.value = null;
  screen.value = "battle";
  startBattle(level, seedParam);
};

/** Meets the level's monsters first if they are new, then fights. */
export const enterBattle = (level: Level) =>
  transit(() => {
    leaveBattle();
    updateSave((progress) => standAt(progress, level));
    const scene = introFor(level, save.value.seen);
    if (!scene) return beginBattle(level);
    intro.value = { scene, level };
    screen.value = "intro";
    playMusic("music_battle");
  });

export const finishIntro = () => {
  const current = intro.value;
  if (!current) return;
  updateSave((progress) => markSeen(progress, current.scene.id));
  enterBattle(current.level);
};

export const visit = (place: "lock" | "cave", land: LandId) =>
  transit(() => {
    visiting.value = land;
    screen.value = place;
  });

/** Straight to one thing at the camp, as the victory panel does for a waiting story. */
export const goToCamp = (activity: Activity | null = null) =>
  transit(() => {
    leaveBattle();
    settingsOpen.value = false;
    campActivity.value = activity;
    screen.value = "campfire";
  });

export const goTo = (next: Exclude<Screen, "battle" | "intro" | "lock" | "cave" | "campfire">) =>
  transit(() => {
    leaveBattle();
    settingsOpen.value = false;
    screen.value = next;
  });

/** `?level=` skips the title, map and intro scenes and opens straight into that battle. */
export const startFromUrl = () => {
  if (levelParam) beginBattle(findLevel(levelParam));
};
