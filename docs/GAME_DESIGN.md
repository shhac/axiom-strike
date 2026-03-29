# Axiom Strike — Game Design Document

## Overview

A 2D turn-based educational fighting game for tablets and phones. Players build math equations to attack enemies and defend against them. A secondary mechanic trains attention span through timed reading comprehension during recovery phases.

- **Target audience:** Ages ~6–12
- **Platforms:** Android + iOS (native app stores)
- **Engine:** Defold (Lua scripting, ~2-5MB APK, MIT-like license, optimised for 2D mobile)
- **Device assumptions:** Low-end hand-me-down or school devices — weak CPU, limited storage, poor battery
- **Art style:** Mix of manga and pixel art, 2D with perspective
- **Monetisation:** Upfront paid. Structured for future operation-type DLC packs (e.g. "Negative Numbers", "Fractions") but nothing gated in v1.

## Core Combat Loop

### Player's Turn (Attack)

1. Enemy has a visible **weakness number** communicated through their character design.
2. Player is given a hand of colourful, tappable **number tiles** and **operator tiles**.
3. Player constructs an equation whose result is as close to the weakness as possible.
4. The result of the equation is always displayed so the player can see and learn.
5. Damage scales with closeness to the weakness. Minimum damage is always 1.

### Enemy's Turn (Defense)

1. Enemy presents an **attack number**.
2. Player constructs an equation to match it (defensive construction / decomposition).
3. Exact match = full block. Close = partial block / graze. Miss = full damage taken.

### Turn Structure

- Turn-based by default. Player taps to end their turn.
- **Optional time pressure mode:** player can submit multiple equations within a time limit. Tiles are consumed on use (no reuse within a turn).
- Spamming random answers is not rewarded (typically results in minimum 1 damage each — trivial). No explicit penalty for wrong answers in v1, but the avenue remains open for future tuning.

## Tile System

- Tiles are **numbers** (not digits — `[33]` is one tile, not `[3][3]`) and **operators**.
- Hand is dealt fresh each turn. Hand should always be solvable (player may receive new tiles if needed).
- Tile order is randomised each turn to prevent muscle memory.
- **"Could be impossible" opt-in mode:** unspent tiles persist between turns, and the hand may not contain a perfect solution. Player must get as close as possible. Off by default.

## Enemy Design

- Enemy **classes** map to mathematical operations:
  - Addition class — distinct visual style
  - Subtraction class — different visual feel
  - Multiplication class — different again
  - Division / fractions class — yet another look
  - (Future: negatives, etc.)
- Character design communicates both the operation type and the weakness number.
- Classes serve as natural difficulty and content grouping.

### Enemy Encounters

- At most **5 enemies per wave**.
- **Boss wave** variant: one stronger enemy, or 1 strong + 2 minions.
- New enemy types are introduced via a conversation scene: the enemy meets the hero and shows off an over-the-top personality. This is the vehicle for teaching new mathematical concepts.

## Mini-Games

**Speed fill-in-the-blank rounds:**
- `6 + 2 = _`
- `7 + _ = 10`
- `_ + 5 = 8`
- `2 _ 3 = 5`

Difficulty scales by: operation type, number size, which piece is missing (result, operand, or operator).

## Recovery / Attention Mechanic

Trains focus and reading comprehension. Framed as HP recovery.

### How It Works

1. Player character on the left, a passage of text on the right.
2. Text stays visible for 30 seconds to 1 minute.
3. After the timer, a **5-option multiple choice** question appears:
   - 1 correct answer → full HP recovery
   - 1 almost-right answer → partial HP recovery
   - 3 wrong answers → no recovery

### When It Triggers

- **Once per wave** — player-initiated (strategic choice: rest vs. attack).
- **Between waves** — available as an interlude.

### Reading Difficulty

- **Auto mode (default):** inferred from the current math difficulty setting.
- **Overridable:** separate setting for players whose reading and math levels don't match (e.g. a maths prodigy who reads at grade level, or vice versa).

### Content Source

- Public domain educational corpus across subjects (literature, science, history — not just maths).
- Must work across UK, Canada, Australia, and USA curricula.
- Corpus needs to be built and curated (no existing pre-chunked, age-leveled source available).

## Progression

### World Map

- Regions represent operation types (e.g. Addition Highlands, Multiplication Caves).
- Nodes within a region scale in number complexity (single-digit → double-digit → negatives, etc.).
- Players can **jump to any region** but nodes within a region unlock sequentially.
- This supports players starting at the right difficulty for them.

### Waves and Levels

- N waves = 1 level/node on the world map.
- Full HP restore between levels.

### Session Design

- Designed around **~5-minute intervals** that chain naturally up to ~20 minutes.
- A more advanced player can do 4 intervals back-to-back as one sitting.

### Unlocks

- **Visual cosmetics** and **consumable items** (e.g. +10 seconds).
- All math content is reachable without unlocks — no pay-to-progress.
- Content gated by operation type is structured for future DLC but fully unlocked in v1.

## Research & Deep Dives

Each of these areas has been researched and documented in dedicated files:

- [Wave / Level Structure](WAVE_STRUCTURE.md) — session pacing, enemy counts per wave, timing, boss encounters. Key takeaway: 3 waves per level at ~5 minutes, 15 nodes per region, 60 levels / ~5 hours of content in v1.
- [Adaptive Difficulty](ADAPTIVE_DIFFICULTY.md) — Elo-based algorithm with per-skill dimensions, targeting ~70% success rate. Cold start via age priors, cross-session decay, math-to-reading grade mapping.
- [Reading Corpus Pipeline](READING_CORPUS_PIPELINE.md) — public domain sources (Gutenberg, US gov), legal safety (author died before 1955), Flesch-Kincaid + Dale-Chall scoring, LLM-assisted question generation. ~3-4 weeks to build, ~2K-5K passages target.
- [Art Direction](ART_DIRECTION_RESEARCH.md) — manga + pixel art hybrid (Scott Pilgrim as closest reference), operation-specific color palettes, "design for the 10yo, accommodate the 6yo through UX", tonal escalation within a fixed style.
- [Recovery Balance](RECOVERY_BALANCE.md) — effort-based reward (30% base for reading + 70% comprehension bonus), 40 HP floor even on wrong answers, adaptive timer, positive failure framing.

## Remaining Open Questions

1. **Exact enemy HP/damage numbers** — depends on playtesting with the wave structure.
2. **Reading corpus curation** — pipeline is designed but needs to be built and content reviewed.
3. **Specific character designs** — art direction principles are set but individual enemy/hero concepts need artist work.
4. **Sound design** — no research done yet. Music, SFX, and accessibility (hearing-impaired players) need thought.
5. **Accessibility** — colorblind modes (important given color-coded enemy classes), screen reader support, motor accessibility for tile selection.
6. **Analytics / telemetry** — what to track for the adaptive difficulty system, privacy considerations for children (COPPA, GDPR-K).
