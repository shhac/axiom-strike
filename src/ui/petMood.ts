import { signal } from "@preact/signals";

/** How the pet on screen is taking things. `worried` is not set here: a battle shows it while an attack is about to land. */
export type PetMood = "calm" | "cheer" | "dance" | "scared" | "worried" | "sad";

export const petMood = signal<PetMood>("calm");

const timer: { id: ReturnType<typeof setTimeout> | null } = { id: null };

/** The pet shows `mood`, for `ms` if given and otherwise until told something else. */
export const petFeels = (mood: PetMood, ms?: number) => {
  if (timer.id) clearTimeout(timer.id);
  petMood.value = mood;
  timer.id = ms === undefined ? null : setTimeout(() => (petMood.value = "calm"), ms);
};
