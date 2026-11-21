import { effect, signal } from "@preact/signals";
import { parseSave, startDay, EMPTY_SAVE, type Save } from "../engine/progress";
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

const today = () => Math.floor(Date.now() / MS_PER_DAY);

export const save = signal<Save>(startDay(read(), today()));

/** Every change to progress goes through here, so it is always written straight to the device. */
export const updateSave = (change: (current: Save) => Save) => {
  save.value = change(save.value);
};

effect(() => {
  const { music, sound } = save.value.settings;
  setAudioPrefs({ music, sound });
});

effect(() => {
  const serialised = JSON.stringify(save.value);
  try {
    localStorage.setItem(KEY, serialised);
  } catch {
    // Storage can be full or blocked; the game carries on with progress kept for this session.
  }
});
