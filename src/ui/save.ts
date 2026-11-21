import { signal } from "@preact/signals";
import type { Level } from "../engine/levels";
import { EMPTY_SAVE, parseSave, recordWin, type Save } from "../engine/progress";

const KEY = "axiom-strike-save-v1";

const read = (): Save => {
  try {
    return parseSave(localStorage.getItem(KEY));
  } catch {
    return EMPTY_SAVE;
  }
};

export const save = signal<Save>(read());

export const saveWin = (level: Level, stars: number) => {
  save.value = recordWin(save.value, level, stars);
  try {
    localStorage.setItem(KEY, JSON.stringify(save.value));
  } catch {
    // Storage can be full or blocked; the game carries on with progress kept for this session.
  }
};
