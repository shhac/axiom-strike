import { signal } from "@preact/signals";
import { startBattle } from "./store";

export type Screen = "title" | "battle";

const params = new URLSearchParams(location.search);
const seedParam = Number(params.get("seed")) || undefined;

/** `?level=` jumps straight into a battle, which is what the automated playthrough uses. */
export const screen = signal<Screen>(params.has("level") ? "battle" : "title");
export const startLevelId = params.get("level");

export const enterBattle = (levelId: string | null) => {
  screen.value = "battle";
  startBattle(levelId, seedParam);
};
