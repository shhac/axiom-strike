import { signal } from "@preact/signals";
import { findLevel, type Level } from "../engine/levels";
import { startBattle } from "./store";

export type Screen = "title" | "map" | "battle";

const params = new URLSearchParams(location.search);
const seedParam = Number(params.get("seed")) || undefined;
const levelParam = params.get("level");

export const screen = signal<Screen>(levelParam ? "battle" : "title");

export const enterBattle = (level: Level) => {
  screen.value = "battle";
  startBattle(level, seedParam);
};

export const goTo = (next: Exclude<Screen, "battle">) => {
  screen.value = next;
};

/** `?level=` skips the title and map and opens straight into that battle. */
export const startFromUrl = () => {
  if (levelParam) enterBattle(findLevel(levelParam));
};
