import type { EnemyKind, OpFamily } from "../engine/levels";

/** One silly line for each monster's page in the book, with a bit of real maths in it. */
export const MONSTER_FACTS: Record<OpFamily, Record<EnemyKind, string>> = {
  add: {
    minion: "Two Bloblings bumping together make one bigger Blobling. That is adding!",
    standard: "Blobbert counts his own wobbles. He always loses count at ten and starts again.",
    boss: "King Glob is one hundred percent slime. That means all of him.",
  },
  sub: {
    minion: "A Spikelet loses a spike every time it sneezes. It has learned not to sneeze.",
    standard: "Sir Prickle takes away one biscuit from every plate. Nobody invites him to tea.",
    boss: "Lord Thornax once took zero away from five and was furious nothing changed.",
  },
  mul: {
    minion: "Sparklings come in pairs. Three pairs is six, which they call a party.",
    standard: "Crystamul knows three times four is the same as four times three. It still shouts both.",
    boss: "Archmage Multiplix multiplied by one, expecting more of himself. Still just one.",
  },
  div: {
    minion: "A Droplet shares every puddle equally, even with people who do not want a puddle.",
    standard: "Dribble will not share seven sweets between two. Somebody would get half a sweet!",
    boss: "The Deep Divider split a hundred into four equal parts. Each part was twenty-five.",
  },
  frac: {
    minion: "A Crumb is a very small part of a whole. It does not like being reminded.",
    standard: "Slicer is one slice of eight. That makes him one eighth of a pizza.",
    boss: "Baron von Gateau is three quarters of a cake. Somebody ate the other quarter.",
  },
};

export const LUCKY_FACT = "Nobody knows where the golden ones come from. They leave after three turns, every time.";
