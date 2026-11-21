import type { Level, OpFamily } from "../engine/levels";

export type Beat = {
  speaker: "enemy" | "hero";
  text: string;
  /** A worked example, drawn in the game's number glyphs. */
  sum?: string;
};

export type Intro = { id: string; family: OpFamily; boss: boolean; name: string; beats: readonly Beat[] };

const FAMILY_INTROS: Record<OpFamily, Intro> = {
  add: {
    id: "add",
    family: "add",
    boss: false,
    name: "Blobbert",
    beats: [
      { speaker: "enemy", text: "BLORP! I am Blobbert, and this is MY grove!" },
      {
        speaker: "enemy",
        text: "See the sword number above my head? That is my weakness. I will NEVER tell you what it... oh. Oops.",
      },
      { speaker: "hero", text: "Tap numbers that add up to the sword number, then STRIKE!", sum: "3+4=7" },
      {
        speaker: "enemy",
        text: "Well, the shield number is how hard I hit! Make THAT number and you parry me. As if you could!",
      },
      { speaker: "hero", text: "More numbers in one sum means a bigger hit.", sum: "2+2+3=7" },
      {
        speaker: "hero",
        text: "And if the numbers left can't make it, I shout IMPOSSIBLE! and swap them for new ones. Let's go!",
      },
    ],
  },
  sub: {
    id: "sub",
    family: "sub",
    boss: false,
    name: "Sir Prickle",
    beats: [
      { speaker: "enemy", text: "HALT! Sir Prickle guards these peaks. Adding alone will not save you here!" },
      {
        speaker: "enemy",
        text: "My weakness hides BETWEEN numbers. You would have to take one away from another. Far too tricky!",
      },
      { speaker: "hero", text: "Tap a number, pick the minus sign, then tap another.", sum: "9-4=5" },
      { speaker: "enemy", text: "Hmph. Just never go below zero. Even I cannot do that." },
    ],
  },
  mul: {
    id: "mul",
    family: "mul",
    boss: false,
    name: "Crystamul",
    beats: [
      { speaker: "enemy", text: "MWAHAHA! You thought adding was tough? I am CRYSTAMUL, master of MULTIPLICATION!" },
      { speaker: "enemy", text: "My weakness is far too BIG to reach by adding. You would need... times tables!" },
      { speaker: "hero", text: "Pick the times sign to multiply two numbers.", sum: "3×4=12" },
      { speaker: "hero", text: "Sums run left to right, one step at a time.", sum: "2+3×4=20" },
    ],
  },
  div: {
    id: "div",
    family: "div",
    boss: false,
    name: "Dribble",
    beats: [
      { speaker: "enemy", text: "Drip... drop... I am Dribble, and I split everything I touch." },
      { speaker: "enemy", text: "My weakness is small. Your numbers are huge. However will you share them out?" },
      { speaker: "hero", text: "Pick the divide sign to share a big number into equal parts.", sum: "12÷3=4" },
      { speaker: "enemy", text: "It only works if it splits evenly. No leftovers allowed down here!" },
    ],
  },
};

const boss = (family: OpFamily, name: string, text: string): Intro => ({
  id: `${family}_boss`,
  family,
  boss: true,
  name,
  beats: [{ speaker: "enemy", text }],
});

const BOSS_INTROS: Record<OpFamily, Intro> = {
  add: boss(
    "add",
    "King Glob",
    "WHO DARES squelch into my throne room? I have ONE HUNDRED health. Bring your biggest sums!",
  ),
  sub: boss("sub", "Lord Thornax", "Every number you take away, I take personally. Now face the Peak Warden!"),
  mul: boss(
    "mul",
    "Archmage Multiplix",
    "Two times two times TROUBLE! My magic multiplies, and so will your problems!",
  ),
  div: boss("div", "The Deep Divider", "I will split you from your stars! Only the sharpest sharing can sink me."),
};

/** The scene to play before this level, if the player has not met its monsters yet. */
export const introFor = (level: Level, seen: readonly string[]): Intro | null => {
  const family = FAMILY_INTROS[level.region];
  if (!seen.includes(family.id)) return family;
  const bossIntro = BOSS_INTROS[level.region];
  const hasBoss = level.waves.some((wave) => wave.some((enemy) => enemy.kind === "boss"));
  return hasBoss && !seen.includes(bossIntro.id) ? bossIntro : null;
};
