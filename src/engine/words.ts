import { WORD_PARTS, type WordPart } from "../content/wordParts";
import { createRng } from "./rng";

export const WORD_ROUNDS = 5;
const CHOICES = 4;

export type WordQuestion = { part: WordPart; options: string[] };

/** Five word parts, each with its meaning hidden among three others that are not also right. */
export const wordQuiz = (seed: number): WordQuestion[] => {
  const rng = createRng(seed);
  return rng
    .shuffle([...WORD_PARTS])
    .slice(0, WORD_ROUNDS)
    .map((part) => {
      const wrong = [...new Set(WORD_PARTS.map((other) => other.meaning))].filter(
        (meaning) => meaning !== part.meaning,
      );
      return { part, options: rng.shuffle([part.meaning, ...rng.shuffle(wrong).slice(0, CHOICES - 1)]) };
    });
};
