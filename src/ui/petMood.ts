import { signal } from "@preact/signals";

/** How the pet has taken what just happened. */
export type PetFeeling = "calm" | "cheer" | "dance" | "scared" | "sad";

/** What the pet shows. A battle adds `worried` itself while an attack is about to land. */
export type PetMood = PetFeeling | "worried";

export const petMood = signal<PetFeeling>("calm");

const timer: { id: ReturnType<typeof setTimeout> | null } = { id: null };

/** The pet shows `feeling`, for `ms` if given and otherwise until told something else. */
export const petFeels = (feeling: PetFeeling, ms?: number) => {
  if (timer.id) clearTimeout(timer.id);
  petMood.value = feeling;
  timer.id = ms === undefined ? null : setTimeout(() => (petMood.value = "calm"), ms);
};

// Two hops and three turns of the dance, as timed in `styles/pet.css`.
const CHEER_MS = 700;
const DANCE_MS = 1900;
const SCARE_MS = 1100;

export const petCheers = () => petFeels("cheer", CHEER_MS);
export const petDances = () => petFeels("dance", DANCE_MS);
export const petCowers = () => petFeels("scared", SCARE_MS);
