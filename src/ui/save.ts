import { effect, signal } from "@preact/signals";
import { startDay, EMPTY_SAVE, type Save } from "../engine/progress";
import { parseSave } from "../engine/saveParser";
import { setAudioPrefs } from "./audio";

const KEY = "axiom-strike-save-v1";
const MS_PER_DAY = 86_400_000;

const read = (): Save => {
  try {
    return parseSave(localStorage.getItem(KEY));
  } catch {
    return EMPTY_SAVE;
  }
};

/** The day in UTC, which is what rating decay has always counted in. */
const utcDay = () => Math.floor(Date.now() / MS_PER_DAY);

/** The day where the player is, read when it is needed, so a streak turns over at their midnight. */
export const localDay = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60_000) / MS_PER_DAY);

export const save = signal<Save>(startDay(read(), utcDay()));

/** Every change to progress goes through here, so it is always written straight to the device. */
export const updateSave = (change: (current: Save) => Save) => {
  save.value = change(save.value);
};

effect(() => {
  const { music, sound } = save.value.settings;
  setAudioPrefs({ music, sound });
});

// The chosen tile style is worn by every tile in the game, whichever screen draws it.
effect(() => {
  document.documentElement.dataset.tiles = save.value.tileStyle ?? "classic";
});

effect(() => {
  const serialised = JSON.stringify(save.value);
  try {
    localStorage.setItem(KEY, serialised);
  } catch {
    // Storage can be full or blocked; the game carries on with progress kept for this session.
  }
});
