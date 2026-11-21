import { describe, expect, it } from "vitest";
import { CHEERS, cheerFor, leadOf, MONSTER_NAMES, tauntFor, TAUNTS } from "../src/content/taunts";

const enemy = (id: number, kind: "minion" | "standard" | "boss") => ({ id, kind, family: "add" as const });

describe("wave taunts", () => {
  it("the highest rank leads, and the first of equals", () => {
    expect(leadOf([enemy(1, "minion"), enemy(2, "standard"), enemy(3, "minion")])?.id).toBe(2);
    expect(leadOf([enemy(1, "minion"), enemy(2, "minion")])?.id).toBe(1);
    expect(leadOf([enemy(1, "standard"), enemy(2, "boss")])?.id).toBe(2);
    expect(leadOf([])).toBeUndefined();
  });

  it("the first wave, later waves and bosses each draw from their own lines", () => {
    expect(TAUNTS.add.first).toContain(tauntFor(enemy(1, "minion"), 0, 5).text);
    expect(TAUNTS.add.later).toContain(tauntFor(enemy(1, "standard"), 2, 5).text);
    expect(TAUNTS.add.boss).toContain(tauntFor(enemy(1, "boss"), 0, 5).text);
    expect(TAUNTS.add.boss).toContain(tauntFor(enemy(1, "boss"), 2, 5).text);
  });

  it("names the speaker by family and rank", () => {
    expect(tauntFor(enemy(1, "boss"), 2, 0).name).toBe(MONSTER_NAMES.add.boss);
  });

  it("any seed, even a negative one, picks a real line", () => {
    [-7, 0, 3, 2147483647].forEach((seed) => {
      expect(CHEERS).toContain(cheerFor(seed));
      expect(tauntFor(enemy(1, "minion"), 0, seed).text).not.toBe("");
    });
  });
});
