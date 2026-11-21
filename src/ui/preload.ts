const FAMILIES = ["add", "sub", "mul", "div"] as const;
const HERO_POSES = ["idle", "attack", "hurt", "victory"] as const;

const SPRITES = [
  ...HERO_POSES.map((pose) => `hero_${pose}`),
  ...FAMILIES.flatMap((family) => [`enemy_${family}`, `enemy_${family}_ko`, `boss_${family}`]),
];

/** Decode every character sprite up front so the first attack or defeat never waits on one. */
export const preloadSprites = () => {
  SPRITES.forEach((name) => {
    const image = new Image();
    image.src = `./assets/chars/${name}.png`;
    image.decode().catch(() => undefined);
  });
};
