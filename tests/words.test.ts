import { describe, expect, it } from "vitest";
import { WORD_KIN, WORD_PARTS } from "../src/content/wordParts";
import { EMPTY_SAVE, recordWords } from "../src/engine/progress";
import { parseSave } from "../src/engine/saveParser";
import {
  fillRun,
  learn,
  NEW_WORD_LAB,
  TOP_BOX,
  wordQuiz,
  WORD_ROUNDS,
  type WordLab,
  type WordQuestion,
} from "../src/engine/words";

describe("word lab", () => {
  const everyPart = (box: number, last: number): WordLab => ({
    runs: 40,
    parts: Object.fromEntries(WORD_PARTS.map(({ part }) => [part, { box, last }])),
  });
  const answersFor = (quiz: WordQuestion[], right: boolean) => quiz.map((q) => ({ part: q.part.part, right }));
  const meaningOf = (part: string) => WORD_PARTS.find((p) => p.part === part)?.meaning;
  const partNames = (parts: readonly { part: string }[]) => parts.map((p) => p.part);

  it("asks five different word parts, each with one right answer among four different choices", () => {
    [NEW_WORD_LAB, everyPart(2, 0), everyPart(TOP_BOX, 40)].forEach((lab) =>
      Array.from({ length: 60 }, (_, seed) => wordQuiz(seed + 1, lab)).forEach((quiz) => {
        expect(quiz).toHaveLength(WORD_ROUNDS);
        expect(new Set(quiz.map((q) => q.part.part)).size).toBe(WORD_ROUNDS);
        quiz.forEach((question) => {
          expect(question.options).toHaveLength(4);
          expect(new Set(question.options).size).toBe(4);
          expect(question.options.filter((option) => option === question.answer)).toHaveLength(1);
          // When parts are the choices, no other part on offer may share the meaning asked for.
          const sameMeaning = question.options.filter(
            (option) => option !== question.answer && meaningOf(option) === question.part.meaning,
          );
          expect(sameMeaning).toEqual([]);
        });
      }),
    );
  });

  it("never offers a part of nearly the same meaning as a wrong answer", () => {
    const parts = WORD_PARTS.map((p) => p.part);
    WORD_KIN.flat().forEach((part) => expect(parts).toContain(part));
    expect(new Set(WORD_KIN.flat()).size).toBe(WORD_KIN.flat().length);
    Array.from({ length: 80 }, (_, seed) => wordQuiz(seed, everyPart(1, 0)))
      .flat()
      .forEach((question) => {
        const kin = WORD_KIN.find((group) => group.includes(question.part.part)) ?? [];
        const kinAnswers = kin
          .filter((part) => part !== question.part.part)
          .flatMap((part) => [part, meaningOf(part) ?? ""]);
        const wrong = question.options.filter((option) => option !== question.answer);
        expect(wrong.filter((option) => kinAnswers.includes(option))).toEqual([]);
      });
  });

  it("shows a part met for the first time with three of its words, and later asks in every way", () => {
    wordQuiz(3).forEach((question) => {
      expect(question.kind).toBe("meaning");
      expect(question.examples).toHaveLength(3);
      question.examples.forEach((word) => expect(question.part.examples).toContain(word));
    });
    const kinds = Array.from({ length: 40 }, (_, seed) => wordQuiz(seed, everyPart(1, 0))).flatMap((quiz) =>
      quiz.map((question) => `${question.kind}:${question.examples.length}`),
    );
    expect([...new Set(kinds)].sort()).toEqual(["meaning:3", "part:0", "word:1"]);
  });

  it("starts with the commonest parts and brings in new ones a few at a time", () => {
    const first = wordQuiz(5);
    expect(first.map((q) => q.part.part).sort()).toEqual(
      WORD_PARTS.slice(0, WORD_ROUNDS)
        .map((p) => p.part)
        .sort(),
    );
    const after = learn(learn(NEW_WORD_LAB, answersFor(first, true)), []);
    const second = wordQuiz(6, after);
    const fresh = second.filter((q) => !after.parts[q.part.part]);
    expect(fresh).toHaveLength(2);
    expect(second.filter((q) => after.parts[q.part.part])).toHaveLength(3);
  });

  it("brings a part answered wrongly back before one answered rightly", () => {
    const quiz = wordQuiz(9);
    const [missed, ...known] = quiz.map((q) => q.part.part);
    const once = learn(NEW_WORD_LAB, answersFor(quiz, true));
    const lab = learn(
      learn(once, [{ part: missed!, right: false }, ...known.map((part) => ({ part, right: true }))]),
      [],
    );
    expect(lab.parts[missed!]).toEqual({ box: 0, last: 2 });
    expect(known.map((part) => lab.parts[part]?.box)).toEqual([1, 1, 1, 1]);
    Array.from({ length: 20 }, (_, seed) => wordQuiz(seed, lab)).forEach((next) => {
      expect(next.map((q) => q.part.part)).toContain(missed);
      expect(next.filter((q) => known.includes(q.part.part))).toHaveLength(0);
    });
  });

  it("never moves a part past the top, and keeps the lab through storage", () => {
    const part = WORD_PARTS[0]!.part;
    const drilled = Array.from({ length: 9 }).reduce<WordLab>(
      (lab) => learn(lab, [{ part, right: true }]),
      NEW_WORD_LAB,
    );
    expect(drilled.parts[part]).toEqual({ box: TOP_BOX, last: 9 });
    const stored = JSON.stringify({
      wordLab: {
        runs: 9,
        parts: { ...drilled.parts, gone: { box: 2, last: 3 }, [WORD_PARTS[1]!.part]: { box: 99, last: 99 } },
      },
    });
    expect(parseSave(stored).wordLab).toEqual({
      runs: 9,
      parts: { [part]: { box: TOP_BOX, last: 9 }, [WORD_PARTS[1]!.part]: { box: TOP_BOX, last: 9 } },
    });
    expect(parseSave(JSON.stringify({ wordLab: "lots" })).wordLab).toEqual(NEW_WORD_LAB);
  });

  it("fills a run with parts to go over, leaving room for new ones while there are any", () => {
    const [a, b, c, d, e, f, g] = WORD_PARTS;
    const all = [a!, b!, c!, d!, e!, f!, g!];
    expect(partNames(fillRun(all, [], []))).toEqual(partNames(all.slice(0, 5)));
    expect(partNames(fillRun(all.slice(0, 5), all.slice(5), []))).toEqual(partNames([a!, b!, c!, f!, g!]));
    // One new part left: it takes one place, not two.
    expect(partNames(fillRun(all.slice(0, 5), [g!], []))).toEqual(partNames([a!, b!, c!, d!, g!]));
    // Nothing new and too little due: parts not yet due make up the five.
    expect(partNames(fillRun([a!, b!], [], all.slice(2)))).toEqual(partNames(all.slice(0, 5)));
    expect(fillRun([a!], [b!], [])).toHaveLength(2);
  });

  it("remembers every run in the save, prize or not", () => {
    const run = (right: number) => WORD_PARTS.slice(0, 5).map(({ part }, i) => ({ part, right: i < right }));
    const first = recordWords(EMPTY_SAVE, run(3), 7);
    expect(first.scrolls).toBe(0);
    expect(first.wordLab).toEqual(learn(NEW_WORD_LAB, run(3)));
    const second = recordWords(first, run(4), 7);
    expect(second.wordLab.runs).toBe(2);
    expect(Object.values(second.wordLab.parts).map((memory) => memory.box)).toEqual([1, 1, 1, 1, 0]);
  });

  it("every example shows its part, and only its part, in capitals", () => {
    expect(new Set(WORD_PARTS.map((p) => p.part)).size).toBe(WORD_PARTS.length);
    WORD_PARTS.forEach(({ part, examples }) => {
      expect(new Set(examples).size, part).toBe(examples.length);
      expect(examples.length, part).toBeGreaterThanOrEqual(3);
      examples.forEach((word) => expect(word.match(/[A-Z]+/g), word).toEqual([part.toUpperCase()]));
    });
  });
});
