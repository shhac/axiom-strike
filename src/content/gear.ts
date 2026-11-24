import type { LandId, OpFamily } from "../engine/levels";

/** The tile style each land's last chest gives. The look itself is in `styles/gear.css`. */
export const STYLE_NAMES: Record<LandId, string> = {
  add: "Leaf tiles",
  sub: "Lava tiles",
  mul: "Crystal tiles",
  div: "Wave tiles",
  big: "Stone tiles",
  frac: "Picnic tiles",
};

/** The pet each land's first chest gives: one of its small monsters, tamed. */
export const PETS: Record<LandId, { name: string; family: OpFamily; golden?: boolean }> = {
  add: { name: "Blobling", family: "add" },
  sub: { name: "Spikelet", family: "sub" },
  mul: { name: "Sparkling", family: "mul" },
  div: { name: "Droplet", family: "div" },
  big: { name: "Golden Blobling", family: "add", golden: true },
  frac: { name: "Crumb", family: "frac" },
};

/** What a pet says when it is tapped at the camp, one after another. */
const PET_LINES: readonly ((name: string) => string)[] = [
  (name) => `${name} is happy to see you!`,
  (name) => `${name} loves a good story.`,
  () => "Squeak! Squeak!",
  (name) => `${name} cheers when you get it exactly right.`,
  (name) => `${name} wants to come on the next adventure.`,
  () => "That tickles!",
];

export const petLine = (name: string, taps: number): string => PET_LINES[taps % PET_LINES.length]?.(name) ?? "";
