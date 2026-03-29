# Wave / Level Structure Proposal

Research-backed proposal for session pacing in Axiom Strike.

---

## Research Grounding

- **Attention spans (ages 6-12):** 2-3 minutes of sustained focus per year of age. Mobile gaming sessions for children average 5-8 minutes.
- **Comparable games:** Prodigy Math uses 10-15 minute "brain breaks"; DragonBox puzzles take 30-90s each; Math Blaster uses 3-wave stages; Pokemon wild encounters are 1-4 turns, trainer battles 3-8 turns.

---

## Waves Per Level

| Difficulty Tier | Waves per Level | Expected Duration |
|---|---|---|
| **Early (tutorial, single-digit)** | 2 waves | ~4 minutes |
| **Standard (single-digit all ops)** | 3 waves | ~5 minutes |
| **Advanced (double-digit, mixed)** | 3 waves | ~6 minutes |
| **Boss levels** | 2 waves + 1 boss wave | ~6-7 minutes |

3 waves is the sweet spot: beginning/middle/end arc within a level.

## Enemies Per Wave

| Difficulty Tier | Wave 1 (opener) | Wave 2 (escalation) | Wave 3 / Boss |
|---|---|---|---|
| **Early** | 1 enemy | 2 enemies | (no wave 3) |
| **Standard** | 2 enemies | 3 enemies | 2-3 enemies |
| **Advanced** | 3 enemies | 3-4 enemies | 4-5 enemies |
| **Boss level** | 2 enemies | 3 enemies | 1 boss OR boss + 2 minions |

## Turn Timing

| Component | Target Time |
|---|---|
| Attack phase (build equation) | 20-30 seconds |
| Defense phase (decompose number) | 15-25 seconds |
| Animation/feedback | 5-8 seconds |
| **Total per turn** | **~40-60 seconds** |

Younger children (6-7) will naturally take longer. Turn-based design absorbs this.

## Boss Encounters

- **Sub-region boss:** 1 boss with 3-4x normal HP (4-6 turns). Boss attacks follow learnable patterns.
- **Region boss:** 1 boss + 2 minions. Player chooses: clear minions first or focus boss.
- Boss weakness numbers require multi-step equations (e.g., weakness 24, tiles encourage `3 x 8`).

## 5-Minute Session Breakdown

```
0:00 - 0:10   Level intro
0:10 - 1:30   Wave 1: 2 enemies, ~3-4 turns
1:30 - 1:50   Between-wave recovery prompt
1:50 - 3:30   Wave 2: 3 enemies, ~4-6 turns
3:30 - 3:50   Between-wave recovery
3:50 - 5:10   Wave 3: 2-3 enemies, ~4-5 turns
5:10 - 5:30   Victory screen, rewards
---
Total: ~5:30
```

Recovery adds ~45-90s per use. Player using recovery once: ~6-6.5 minutes. Skipping: ~5-5.5 minutes.

## Session Cadence

| Session Type | Content | Duration |
|---|---|---|
| Quick | 1 level (3 waves) | ~5 minutes |
| Medium | 2-3 levels | ~12-15 minutes |
| Full | 4 levels including boss | ~20 minutes |

## World Map Structure Implication

```
Region (e.g., "Addition Highlands")
  Sub-region A: 4 standard + 1 sub-boss = 5 nodes
  Sub-region B: 4 standard + 1 sub-boss = 5 nodes
  Sub-region C: 4 standard + 1 region boss = 5 nodes
  ---
  15 nodes per region, ~75 minutes content
```

4 regions in v1 = 60 levels, ~5 hours of core content.

## Playtesting Levers

1. **Turns-to-kill** — start at 1-2 for normal enemies, 4-6 for bosses
2. **Recovery reading time** — 30s may be short for young readers, 60s may break flow for older
3. **Early level wave count** — 2 waves may feel too short; consider bonus mini-game wave
