import type { LandId, OpFamily } from "../engine/levels";

/** The tile style each land's first chest gives. The look itself is in `styles/gear.css`. */
export const STYLE_NAMES: Record<LandId, string> = {
  add: "Leaf tiles",
  sub: "Lava tiles",
  mul: "Crystal tiles",
  div: "Wave tiles",
  big: "Stone tiles",
  frac: "Picnic tiles",
};

/** The pet each land's last chest gives: one of its small monsters, tamed. */
export const PETS: Record<LandId, { name: string; family: OpFamily; golden?: boolean }> = {
  add: { name: "Blobling", family: "add" },
  sub: { name: "Spikelet", family: "sub" },
  mul: { name: "Sparkling", family: "mul" },
  div: { name: "Droplet", family: "div" },
  big: { name: "Golden Blobling", family: "add", golden: true },
  frac: { name: "Crumb", family: "frac" },
};
