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

/** Four frames side by side, played as a loop or once through. */
const strip = (name: string) => `./assets/chars/anim/${name}.png`;

export const heroStrip = (pose: HeroPose) => strip(`hero_${pose}`);

export const enemyStrip = (family: OpFamily, kind: EnemyKind) =>
  strip(`${kind === "boss" ? "boss" : "enemy"}_${family}`);

export const knockedOutSprite = (family: OpFamily) => `./assets/chars/enemy_${family}_ko.png`;

export const ALL_SPRITES = [
  ...HERO_POSES.map(heroStrip),
  ...REGIONS.flatMap(({ id }) => [enemyStrip(id, "standard"), enemyStrip(id, "boss"), knockedOutSprite(id)]),
];
