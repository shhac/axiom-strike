import type { EnemyKind, OpFamily } from "../engine/levels";

export const MONSTER_NAMES: Record<OpFamily, Record<EnemyKind, string>> = {
  add: { minion: "Blobling", standard: "Blobbert", boss: "King Glob" },
  sub: { minion: "Spikelet", standard: "Sir Prickle", boss: "Lord Thornax" },
  mul: { minion: "Sparkling", standard: "Crystamul", boss: "Archmage Multiplix" },
  div: { minion: "Droplet", standard: "Dribble", boss: "The Deep Divider" },
  frac: { minion: "Crumb", standard: "Slicer", boss: "Baron von Gateau" },
};

type Lines = { first: readonly string[]; later: readonly string[]; boss: readonly string[] };

/** What a wave's lead monster shouts as it arrives. Short enough to read in a glance. */
export const TAUNTS: Record<OpFamily, Lines> = {
  add: {
    first: ["Blorp! You can't add us up!", "Squish the hero!", "This grove is OURS!"],
    later: ["More of us! Count THAT!", "Blorp blorp! Round two!", "You popped my friends? Rude!"],
    boss: ["Bow to King Glob!", "I am one hundred percent slime!"],
  },
  sub: {
    first: ["Halt! Take THAT away!", "Prickles at the ready!", "You shall not pass these peaks!"],
    later: ["We are not finished, hero!", "Minus one hero, coming up!", "Sharper spikes this time!"],
    boss: ["Lord Thornax takes it personally!", "Subtract yourself from my peak!"],
  },
  mul: {
    first: ["Mwahaha! Feel my times tables!", "Double trouble for you!", "My magic multiplies!"],
    later: ["Two times the monsters!", "Again, and again, and AGAIN!", "You only made us stronger!"],
    boss: ["Two times two times TROUBLE!", "Behold, Archmage Multiplix!"],
  },
  div: {
    first: ["Drip... drop... split!", "We share NOTHING with you!", "Divide and conquer!"],
    later: ["Split up and soak the hero!", "No leftovers this time!", "Drip drop, round we go!"],
    boss: ["I will split you from your stars!", "The deep divides us all!"],
  },
  frac: {
    first: ["You only get HALF a chance!", "A quarter of you will be left!", "Slice and dice!"],
    later: ["Seconds, anyone?", "We come in pieces!", "Another slice of trouble!"],
    boss: ["You cannot have your cake AND beat it!", "Three quarters of me is ALL trouble!"],
  },
};

/** What the hero says when a wave is cleared. */
export const CHEERS = [
  "Wave clear! Who's next?",
  "Yes! Bring the next lot!",
  "Too easy! Next!",
  "That's how it's done!",
];

const RANK: Record<EnemyKind, number> = { minion: 0, standard: 1, boss: 2 };

export type Speaker = { id: number; kind: EnemyKind; family: OpFamily };

/** The highest-ranked monster of a wave does the talking. */
export const leadOf = <T extends Speaker>(enemies: readonly T[]): T | undefined =>
  enemies.reduce<T | undefined>(
    (lead, enemy) => (lead && RANK[lead.kind] >= RANK[enemy.kind] ? lead : enemy),
    undefined,
  );

const pickFrom = (lines: readonly string[], seed: number) => lines[Math.abs(seed) % lines.length] ?? "";

export const tauntFor = (lead: Speaker, wave: number, seed: number): { name: string; text: string } => {
  const lines = TAUNTS[lead.family];
  const pool = lead.kind === "boss" ? lines.boss : wave === 0 ? lines.first : lines.later;
  return { name: MONSTER_NAMES[lead.family][lead.kind], text: pickFrom(pool, seed) };
};

export const cheerFor = (seed: number) => pickFrom(CHEERS, seed);
