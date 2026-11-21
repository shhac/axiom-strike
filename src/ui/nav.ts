import { signal } from "@preact/signals";
import { startBattle } from "./store";

export type Screen = "title" | "map" | "battle";

const params = new URLSearchParams(location.search);
const seedParam = Number(params.get("seed")) || undefined;

/** `?level=` jumps straight into a battle, which is what the automated playthrough uses. */
export const startLevelId = params.get("level");
export const screen = signal<Screen>(startLevelId ? "battle" : "title");

export const enterBattle = (levelId: string) => {
  screen.value = "battle";
  startBattle(levelId, seedParam);
};

export const goTo = (next: Exclude<Screen, "battle">) => {
  screen.value = next;
};
