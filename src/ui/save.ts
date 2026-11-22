import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { effect, signal } from "@preact/signals";
import { startDay, type Save } from "../engine/progress";
import { parseSave } from "../engine/saveParser";
import { setAudioPrefs } from "./audio";

const KEY = "axiom-strike-save-v1";
const MS_PER_DAY = 86_400_000;

const readLocal = (): string | null => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

/** The day in UTC, which is what rating decay has always counted in. */
const utcDay = () => Math.floor(Date.now() / MS_PER_DAY);

/** The day where the player is, read when it is needed, so a streak turns over at their midnight. */
export const localDay = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60_000) / MS_PER_DAY);

const local = readLocal();
const opened = (stored: string | null): Save => startDay(parseSave(stored), utcDay());

export const save = signal<Save>(opened(local));

// A phone may clear the web view's storage when it runs short of space (iOS does), so the app keeps
// a second copy in the device's own preferences and takes progress from there when the first is gone.
const keepsBackup = Capacitor.isNativePlatform();

/** Settles once any progress kept only in the backup has been put back; the game is drawn after it. */
export const saveReady: Promise<void> = keepsBackup
  ? Preferences.get({ key: KEY })
      .then(({ value }) => {
        if (local === null && value !== null) save.value = opened(value);
      })
      .catch(() => undefined)
  : Promise.resolve();

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
  if (!keepsBackup) return;
  // Written only once the backup has been read, and with the save as it is by then, so an empty
  // first save can never replace the progress the backup is holding.
  void saveReady.then(() => Preferences.set({ key: KEY, value: JSON.stringify(save.value) })).catch(() => undefined);
});
