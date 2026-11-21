import { ALL_SPRITES } from "./assets";

/** Decode every character sprite up front so the first attack or defeat never waits on one. */
export const preloadSprites = () => {
  ALL_SPRITES.forEach((src) => {
    const image = new Image();
    image.src = src;
    image.decode().catch(() => undefined);
  });
};
