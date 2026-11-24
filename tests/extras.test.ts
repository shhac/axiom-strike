import { describe, expect, it } from "vitest";
import { placeTile, type Board } from "../src/engine/board";
import { caveLevel, caveRiddles, caveStars, CAVE_ROUNDS, isRight } from "../src/engine/cave";
import { applyStep } from "../src/engine/equation";
import { showNumber } from "../src/engine/fractions";
import { findLevel, REGIONS } from "../src/engine/levels";
import { isUnlocked as lockOpen, lockLevel, newLock, pickDial, redealLock, tryDial } from "../src/engine/lock";
import { newPractice, shoot, skipTarget } from "../src/engine/practice";
import {
  chestReady,
  EMPTY_SAVE,
  hasCaveKey,
  isUnlocked,
  landIsOpen,
  markPlayed,
  nextGate,
  openChest,
  ownsPet,
  ownsStyle,
  recordCave,
  recordPractice,
  recordWords,
  recordWin,
  totalStars,
  wear,
  type Save,
} from "../src/engine/progress";
import { parseSave } from "../src/engine/saveParser";
import { solve } from "../src/engine/solver";
import { WORD_PARTS } from "../src/content/wordParts";
import { separateAnswers } from "./helpers";

/** Places the two tiles of the first exact pair for `target` that is still free. */
const placePair = <T extends Board & { level: { ops: readonly ("+" | "-" | "×" | "÷")[]; grain?: number } }>(
  board: T,
  target: number,
): T => {
  const free = board.hand.filter((tile) => !tile.used);
  const { ops, grain } = board.level;
  const found = free.flatMap((a) =>
    free.flatMap((b) =>
      a.id === b.id
        ? []
        : ops.filter((op) => applyStep(a.value, { op, value: b.value }, grain) === target).map((op) => ({ a, b, op })),
    ),
  )[0];
  if (!found) return board;
  const first = placeTile(board, found.a.id, board.level);
  if (first === null || typeof first === "string") return board;
  const second = placeTile({ ...first, equation: { ...first.equation, pendingOp: found.op } }, found.b.id, board.level);
  return second === null || typeof second === "string" ? board : { ...board, ...second };
};

const withStars = (stars: Record<string, number>): Save => ({ ...EMPTY_SAVE, stars });
const fullLand = (land: string, each = 3) => Object.fromEntries([1, 2, 3, 4, 5].map((n) => [`${land}_${n}`, each]));

describe("chest lock", () => {
  it("always holds a two-tile answer for every dial on separate tiles, in every land and for every chest", () => {
    const stuck = REGIONS.flatMap((region) =>
      [0, 1, 2].flatMap((gate) =>
        Array.from({ length: 40 }, (_, seed) => newLock(lockLevel(region.id, gate), seed + 1)).flatMap((lock) => {
          const values = lock.hand.map((tile) => tile.value);
          return separateAnswers(values, lock.level.ops, lock.targets, [], lock.level.grain)
            ? []
            : [`${region.id} chest ${gate}: ${values} for ${lock.targets}`];
        }),
      ),
    );
    expect(stuck).toEqual([]);
  });

  it("hands the tiles back on a wrong sum and uses them up on a right one", () => {
    const lock = newLock(lockLevel("add", 0), 3);
    const [a, b] = lock.hand;
    const wrongSum = placeTile(placeTile(lock, a!.id, lock.level) as Board, b!.id, lock.level) as Board;
    const tried = tryDial({ ...lock, ...wrongSum, targets: [999, lock.targets[1]!, lock.targets[2]!] });
    expect(tried.opened).toBe(false);
    expect(tried.lock.hand.every((tile) => !tile.used)).toBe(true);

    const right = tryDial(placePair(lock, lock.targets[0]!));
    expect(right.opened).toBe(true);
    expect(right.lock.open).toEqual([true, false, false]);
    expect(right.lock.dial).toBe(1);
    expect(right.lock.hand.filter((tile) => tile.used)).toHaveLength(2);
  });

  it("deals fresh tiles for the dials still shut", () => {
    const one = tryDial(placePair(newLock(lockLevel("add", 0), 3), newLock(lockLevel("add", 0), 3).targets[0]!)).lock;
    const again = redealLock(one, 99);
    expect(again.hand.every((tile) => !tile.used)).toBe(true);
    const finished = [1, 2].reduce(
      (lock, dial) => tryDial(placePair(pickDial(lock, dial), lock.targets[dial]!)).lock,
      again,
    );
    expect(lockOpen(finished)).toBe(true);
  });
});

describe("caves", () => {
  it("asks eight riddles whose truth matches the solver over all five tiles", () => {
    REGIONS.forEach((region) => {
      const level = caveLevel(region.id);
      const riddles = caveRiddles(level, 12);
      expect(riddles).toHaveLength(CAVE_ROUNDS);
      riddles.forEach((riddle) => {
        const truth = solve(riddle.hand, level.ops, riddle.target, { maxTiles: 5, grain: level.grain });
        expect(truth !== null).toBe(riddle.answer !== null);
        expect(isRight(riddle, truth !== null)).toBe(true);
        expect(isRight(riddle, truth === null)).toBe(false);
      });
    });
  });

  it("mixes possible and impossible riddles in the first four lands", () => {
    ["add", "sub", "mul", "div"].forEach((land) => {
      const possible = caveRiddles(caveLevel(REGIONS.find((r) => r.id === land)!.id), 5).filter((r) => r.answer).length;
      expect(possible).toBeGreaterThanOrEqual(3);
      expect(possible).toBeLessThanOrEqual(6);
    });
  });

  it("gives stars for four, six and eight right", () => {
    expect([3, 4, 5, 6, 7, 8].map(caveStars)).toEqual([0, 1, 1, 2, 2, 3]);
  });
});

describe("target practice", () => {
  const level = findLevel("add_1");

  it("scores a hit and moves on, and hands tiles back on a miss", () => {
    const start = newPractice(level, 4);
    const hit = shoot(placePair(start, start.target));
    expect(hit.gained).toBe(1);
    expect(hit.practice.score).toBe(1);
    expect(hit.practice.hand.every((tile) => !tile.used)).toBe(true);
    expect(hit.practice.hand[0]!.id).not.toBe(start.hand[0]!.id);

    const miss = shoot(placePair(start, start.target + 1 === 0 ? 1 : start.target - 1));
    expect(miss.practice.score).toBe(0);
    expect(miss.practice.hand.every((tile) => !tile.used)).toBe(true);
  });

  it("always deals a target two tiles can make, and Skip deals another", () => {
    const rounds = Array.from({ length: 50 }, (_, i) => i).reduce<number[]>((stuck, seed) => {
      const practice = skipTarget(newPractice(level, seed + 1));
      return shoot(placePair(practice, practice.target)).gained > 0 ? stuck : [...stuck, seed];
    }, []);
    expect(rounds).toEqual([]);
  });
});

describe("star chests", () => {
  it("open at five, ten and fifteen stars and give a pet, a key and a style in turn", () => {
    expect(chestReady(withStars({ add_1: 3, add_2: 1 }), "add")).toBe(false);
    const five = withStars({ add_1: 3, add_2: 2 });
    expect(chestReady(five, "add")).toBe(true);

    const first = openChest(five, "add");
    expect(first).toMatchObject({ potions: 1, scrolls: 1, tileStyle: null, pet: "add" });
    expect([ownsPet(first, "add"), hasCaveKey(first, "add"), ownsStyle(first, "add")]).toEqual([true, false, false]);
    expect(nextGate(first, "add")).toBe(10);
    expect(openChest(first, "add")).toBe(first);

    const all = [0, 1, 2].reduce((save) => openChest(save, "add"), withStars(fullLand("add")));
    expect(all).toMatchObject({ potions: 3, scrolls: 3, tileStyle: "add", pet: "add" });
    expect(hasCaveKey(all, "add")).toBe(true);
    expect(nextGate(all, "add")).toBeNull();
  });

  it("only lets what has been won be worn", () => {
    const owner = [0, 1, 2].reduce((save) => openChest(save, "add"), withStars(fullLand("add")));
    expect(wear(owner, { pet: "sub", tileStyle: "sub" })).toMatchObject({ pet: "add", tileStyle: "add" });
    expect(wear(owner, { pet: null, tileStyle: null })).toMatchObject({ pet: null, tileStyle: null });
  });
});

describe("far lands", () => {
  it("open on stars in total, and cave stars do not count", () => {
    const twenty = withStars({ ...fullLand("add"), sub_1: 3, sub_2: 2, cave_add: 3 });
    expect(totalStars(twenty)).toBe(20);
    expect(landIsOpen(twenty, "big")).toBe(true);
    expect(landIsOpen(twenty, "frac")).toBe(false);
    expect(isUnlocked(twenty, findLevel("big_1"))).toBe(true);
    expect(isUnlocked(twenty, findLevel("frac_1"))).toBe(false);
    expect(landIsOpen(withStars({ ...fullLand("add"), cave_add: 3, cave_sub: 3 }), "big")).toBe(false);
  });
});

describe("playing each day", () => {
  it("adds a day in a row and halves after a gap", () => {
    const one = markPlayed(EMPTY_SAVE, 100);
    expect(one).toMatchObject({ streak: { days: 1, lastDay: 100 } });
    expect(markPlayed(one, 100)).toBe(one);
    const week = [101, 102, 103, 104, 105, 106].reduce(markPlayed, one);
    expect(week.streak.days).toBe(7);
    expect(markPlayed(week, 110).streak).toEqual({ days: 3, lastDay: 110 });
    expect(markPlayed(one, 150).streak.days).toBe(1);
    // A clock that goes backwards changes nothing.
    expect(markPlayed(week, 103)).toBe(week);
  });

  it("pays each camp prize once a day, and only for a good enough run", () => {
    const low = recordPractice(EMPTY_SAVE, 2, 7);
    expect(low).toMatchObject({ potions: 0, practiceBest: 2 });
    const good = recordPractice(low, 5, 7);
    expect(good).toMatchObject({ potions: 1, practiceBest: 5 });
    expect(recordPractice(good, 9, 7)).toMatchObject({ potions: 1, practiceBest: 9 });
    expect(recordPractice(good, 4, 8)).toMatchObject({ potions: 2, practiceBest: 5 });

    const run = (right: number) => WORD_PARTS.slice(0, 5).map(({ part }, i) => ({ part, right: i < right }));
    expect(recordWords(EMPTY_SAVE, run(3), 7).scrolls).toBe(0);
    const words = recordWords(EMPTY_SAVE, run(4), 7);
    expect(words.scrolls).toBe(1);
    expect(recordWords(words, run(5), 7).scrolls).toBe(1);
    expect(recordWords(words, run(5), 8).scrolls).toBe(2);
    expect(recordPractice(good, 9, 6).potions).toBe(1);
  });

  it("keeps a cave's best stars and pays for its first clear only", () => {
    const first = recordCave(EMPTY_SAVE, "cave_add", 1);
    expect(first).toMatchObject({ stars: { cave_add: 1 }, potions: 1, scrolls: 1 });
    expect(recordCave(first, "cave_add", 3)).toMatchObject({ stars: { cave_add: 3 }, potions: 1 });
    expect(recordCave(first, "cave_add", 0)).toBe(first);
  });
});

describe("saving the new progress", () => {
  it("survives a round trip and tolerates rubbish", () => {
    const played: Save = {
      ...recordWin(markPlayed(EMPTY_SAVE, 200), findLevel("add_1"), 3),
      chests: { ...EMPTY_SAVE.chests, add: 3, frac: 1 },
      pet: "frac",
      tileStyle: "add",
      beaten: { add_minion: 4, lucky: 1 },
      practiceBest: 12,
      daily: { day: 200, practice: true, words: false },
    };
    expect(parseSave(JSON.stringify(played))).toEqual(played);
    const junk = parseSave(JSON.stringify({ chests: { add: 9, sub: "x" }, pet: "dragon", streak: 4, daily: null }));
    expect(junk.chests.add).toBe(3);
    expect(junk.chests.sub).toBe(0);
    expect(junk).toMatchObject({ pet: null, streak: EMPTY_SAVE.streak, daily: EMPTY_SAVE.daily });
    // A pet or style whose chest was never opened is not kept.
    expect(parseSave(JSON.stringify({ pet: "sub", tileStyle: "sub", chests: { sub: 1 } }))).toMatchObject({
      pet: "sub",
      tileStyle: null,
    });
  });
});

describe("numbers", () => {
  it("writes halves and quarters the way a child reads them", () => {
    expect([0.5, 2.5, 0.25, 3.75, 4, 12].map(showNumber)).toEqual(["½", "2½", "¼", "3¾", "4", "12"]);
  });
});
