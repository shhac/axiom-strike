import { WORD_KIN, WORD_PARTS, type WordPart } from "../content/wordParts";
import { createRng, type Rng } from "./rng";

export const WORD_ROUNDS = 5;
const CHOICES = 4;
const EXAMPLES_SHOWN = 3;
/** New parts in a run when there are also parts to go over again. */
const FRESH_PER_RUN = 2;

/**
 * How a part is asked:
 * - `meaning`: three words that share it are shown; say what it means.
 * - `word`: one word is shown; say what the part in it means. Harder, with less to go on.
 * - `part`: the meaning is given; pick the part.
 */
export type WordKind = "meaning" | "word" | "part";

export type WordQuestion = {
  kind: WordKind;
  part: WordPart;
  /** The words shown: three for `meaning`, one for `word`, none for `part`. */
  examples: string[];
  options: string[];
  answer: string;
};

/** What the lab remembers about one part: how well it is known, and the run it was last asked in. */
export type WordMemory = { box: number; last: number };
export type WordLab = { runs: number; parts: Record<string, WordMemory> };
export const NEW_WORD_LAB: WordLab = { runs: 0, parts: {} };

/**
 * Runs to wait before a part comes round again, by how well it is known. A right answer moves a
 * part up one, a wrong one sends it back to the start, so shaky parts return soonest.
 */
const WAIT_RUNS = [1, 2, 4, 8, 16];
export const TOP_BOX = WAIT_RUNS.length - 1;

const kinOf = (part: WordPart): readonly string[] => WORD_KIN.find((group) => group.includes(part.part)) ?? [];

/** Parts that could not also be a right answer: a different meaning, and not a near neighbour in meaning. */
const unlike = (part: WordPart): WordPart[] =>
  WORD_PARTS.filter((other) => other.meaning !== part.meaning && !kinOf(part).includes(other.part));

const overdueBy = (lab: WordLab, memory: WordMemory) => lab.runs - memory.last - (WAIT_RUNS[memory.box] ?? 1);

/**
 * Fills a run's places. Parts to go over come first but leave room for new ones while any are left;
 * whatever is still empty goes to more of the due parts, then to parts not yet due.
 */
export const fillRun = (
  due: readonly WordPart[],
  fresh: readonly WordPart[],
  resting: readonly WordPart[],
): WordPart[] => {
  const reviewPlaces = Math.max(WORD_ROUNDS - FRESH_PER_RUN, WORD_ROUNDS - fresh.length);
  const reviews = due.slice(0, reviewPlaces);
  const added = fresh.slice(0, WORD_ROUNDS - reviews.length);
  return [...reviews, ...added, ...due.slice(reviews.length), ...resting].slice(0, WORD_ROUNDS);
};

/**
 * The parts for a run: those due to be gone over (shakiest first), then new ones in the order the
 * list gives them, which starts with the most common. Parts not yet due only fill what is left.
 */
export const partsForRun = (lab: WordLab, rng: Rng): WordPart[] => {
  const seen = WORD_PARTS.flatMap((part) => {
    const memory = lab.parts[part.part];
    return memory ? [{ part, memory, overdue: overdueBy(lab, memory) }] : [];
  });
  const byNeed = (a: (typeof seen)[number], b: (typeof seen)[number]) =>
    a.memory.box - b.memory.box || b.overdue - a.overdue;
  const due = rng
    .shuffle(seen.filter((entry) => entry.overdue >= 0))
    .sort(byNeed)
    .map((entry) => entry.part);
  const fresh = WORD_PARTS.filter((part) => !lab.parts[part.part]);
  const resting = rng
    .shuffle(seen.filter((entry) => entry.overdue < 0))
    .sort((a, b) => b.overdue - a.overdue)
    .map((entry) => entry.part);

  return rng.shuffle(fillRun(due, fresh, resting));
};

/** A part met for the first time is shown with three words; after that any way of asking may come up. */
const kindFor = (memory: WordMemory | undefined, rng: Rng): WordKind =>
  memory ? rng.pick<WordKind>(["meaning", "word", "part"]) : "meaning";

const ask = (part: WordPart, kind: WordKind, rng: Rng): WordQuestion => {
  const others = rng.shuffle(unlike(part));
  const mixed = (answer: string, wrong: string[]) => rng.shuffle([answer, ...wrong.slice(0, CHOICES - 1)]);
  if (kind === "part") {
    const options = mixed(
      part.part,
      others.map((other) => other.part),
    );
    return { kind, part, examples: [], options, answer: part.part };
  }
  const shown = rng.shuffle(part.examples).slice(0, kind === "word" ? 1 : EXAMPLES_SHOWN);
  const meanings = [...new Set(others.map((other) => other.meaning))];
  return { kind, part, examples: shown, options: mixed(part.meaning, meanings), answer: part.meaning };
};

/** Five questions for this run, chosen and asked to suit what the child already knows. */
export const wordQuiz = (seed: number, lab: WordLab = NEW_WORD_LAB): WordQuestion[] => {
  const rng = createRng(seed);
  return partsForRun(lab, rng).map((part) => ask(part, kindFor(lab.parts[part.part], rng), rng));
};

export type WordAnswer = { part: string; right: boolean };

export const rightCount = (answers: readonly WordAnswer[]): number => answers.filter((answer) => answer.right).length;

/** What the lab knows after a run: each part asked moves up or back to the start, and the run is counted. */
export const learn = (lab: WordLab, answers: readonly WordAnswer[]): WordLab => {
  const runs = lab.runs + 1;
  const parts = answers.reduce<Record<string, WordMemory>>((known, { part, right }) => {
    const box = right ? Math.min(TOP_BOX, (known[part]?.box ?? -1) + 1) : 0;
    return { ...known, [part]: { box, last: runs } };
  }, lab.parts);
  return { runs, parts };
};
