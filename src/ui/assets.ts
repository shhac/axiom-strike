import { REGIONS, type EnemyKind, type OpFamily } from "../engine/levels";

export const icon = (name: string) => `./assets/icons/${name}.png`;

const GLYPH_FILES: Record<string, string> = {
  "+": "plus",
  "-": "minus",
  "−": "minus",
  "×": "times",
  "÷": "divide",
  "=": "equals",
  "!": "bang",
};

export const glyphFile = (char: string): string | undefined => (/\d/.test(char) ? char : GLYPH_FILES[char]);

export const glyphSrc = (file: string) => `./assets/glyphs/${file}.png`;

const HERO_POSES = ["idle", "attack", "hurt", "victory"] as const;
export type HeroPose = (typeof HERO_POSES)[number];

const charSprite = (name: string) => `./assets/chars/${name}.png`;

export const heroSprite = (pose: HeroPose) => charSprite(`hero_${pose}`);

export const enemySprite = (family: OpFamily, kind: EnemyKind, down: boolean) => {
  if (down) return charSprite(`enemy_${family}_ko`);
  return charSprite(`${kind === "boss" ? "boss" : "enemy"}_${family}`);
};

export const ALL_SPRITES = [
  ...HERO_POSES.map(heroSprite),
  ...REGIONS.flatMap(({ id }) => [
    enemySprite(id, "standard", false),
    enemySprite(id, "standard", true),
    enemySprite(id, "boss", false),
  ]),
];
