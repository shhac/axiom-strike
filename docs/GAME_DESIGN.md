# Axiom Strike — Game Design Document

## Overview

A 2D turn-based educational fighting game for phones and tablets. Players build sums from number tiles to strike monsters and to parry their attacks. Between fights, a campfire reading scene trains attention and comprehension and pays out items for the next battle.

- **Target audience:** ages ~6–12
- **Platforms:** Android + iOS (native app stores), landscape only
- **Stack:** web app (TypeScript, Vite, Preact, DOM/CSS rendering) packaged with Capacitor. See "Technology" below.
- **Device floor:** base Samsung Galaxy S21 and newer
- **Art style:** bright pixel art with manga energy; one generated, consistent set
- **Monetisation:** upfront paid. Structured for future operation-type packs (e.g. "Negative Numbers", "Fractions") but nothing gated in v1.

The first version of this game was built in Defold and is preserved as the git tag `defold-final`. This document describes the rebuild; where it differs from the first version, the first version was wrong.

## Design pillars

1. **One skill, used for everything.** Building a number from tiles is how you attack and how you defend. There is no separate quiz mode.
2. **Every turn is a decision.** Enemies show what they are about to do. The player chooses what to spend a limited hand on.
3. **Deeper maths is stronger, never required.** Two-number sums always win a level. Longer equations win it faster and safer.
4. **Guessing gets nowhere, mistakes are cheap.** A far miss does nothing; it does not punish. A child who is trying always makes progress.
5. **Reading is a reward loop, not a time-out.** It happens between fights, at the child's pace, and gives things worth having.

## Core combat

### What the player sees

- The hero on the left, up to three monsters on the right.
- Above each monster, two tappable chips:
  - **Weakness** (sword): the number that hurts it.
  - **Attack** (shield): the number it will hit for, and how many turns until it lands.
- A hand of **seven number tiles**, dealt fresh every turn.
- The level's **operator signs**. Signs are always available and are not used up. A level with one sign (e.g. only `+`) applies it automatically, so the youngest players just tap numbers.

### Building an equation

- Tap a chip to choose what to aim at. The game always starts a turn aimed at a weakness that the hand can make exactly.
- Tap tiles (and signs, when there is more than one) to build `number sign number sign number …`.
- Evaluation is **left to right**, and the running total is always on screen.
- Every running total must be a whole number of zero or more. A tap that would break that is refused with a short message.
- An equation needs at least two numbers.

### Strike (aimed at a weakness)

| Result | Effect |
|---|---|
| Exact, 2 numbers | 20 damage |
| Exact, 3 numbers | 35 damage |
| Exact, 4 numbers | 55 damage |
| Exact, 5+ numbers | 80 damage |
| One away | 1 damage ("So close!") |
| Further off | Miss, no damage |

- Only numbers that were needed count. `3 + 4 + 5 − 5` is a two-number seven: adding a number and taking it away again earns nothing.
- A monster that survives an exact hit **changes its weakness**, so no sum is repeated.
- Monster health: minion 20, standard 40, boss 100.

### Parry (aimed at an attack)

- **Exact:** the attack is cancelled, the monster is staggered (it starts a new attack from scratch) and takes a counter hit of 5 per number used.
- **Close:** the attack is softened by how close the answer was, but never by more than half.
- An attack lands for its number. An attack of 9 that nobody parried costs 9 health.
- A monster whose attack was ignored completely gets angrier: its next attack number is 2 higher (up to three times).

### Turn structure

- Tiles are used up when cast. The player may cast several equations in a turn.
- The turn ends when the player taps **End turn**, or automatically when fewer than two tiles are left.
- Then each monster's countdown drops by one; any that reach zero attack. Monsters attack every two turns, and never on the first turn of a wave. At most two attacks land on the same turn.
- Hero health is 100 and carries across the waves of a level. It is restored between levels.

### The dealing promise

Every hand contains, on separate tiles:

- an exact two-number answer for the weakness the turn starts aimed at, and
- an exact two-number answer for each attack landing this turn (at most two).

Spare tiles first go to a three-number answer for the same weakness, then to random numbers. This is checked by a test over thousands of seeded hands.

### Hints

- Three hint scrolls per level. More are earned at the campfire.
- A hint lights up the whole path to the aimed number, one tile at a time. If what is already on the board cannot get there, the hint starts the equation over.
- If no exact answer is left this turn, the game says so and the scroll is not spent.
- Nothing is revealed for free by waiting.

### Winning and losing

- A level is three waves. Clearing the last wave wins.
- Stars: 3 for finishing on 70%+ health, 2 for 35%+, otherwise 1.
- Losing is framed as "So close! Try again" and costs nothing.

### Balance targets (checked by simulated players in the test suite)

- A player who only ever makes exact two-number sums wins the first level at least 90% of the time, even if they never parry.
- A player who uses longer equations finishes in fewer turns.
- A player who taps two random tiles and casts loses most of the time.

## Enemies

- Enemy **families** map to operations and to a look: addition (green slimes), subtraction (red spiky), multiplication (purple wizards), division (blue water drops).
- Three ranks per family: minion, standard, boss.
- (Not built yet) New families are introduced by a short **intro scene**: the monster meets the hero and shows off an over-the-top personality. This is where a new operation is explained.

## Campfire (reading) — designed, not built yet

Between levels the hero rests at a campfire and may read a scroll.

1. A short public-domain passage is shown. **There is no forced timer**: the child reads at their own pace and taps when ready. Time taken is recorded for difficulty tuning, not shown as pressure.
2. A multiple-choice question follows (one right answer, one nearly right, three wrong).
3. Rewards are items for the next battle: hint scrolls and potions. A right answer gives the most; a nearly right answer gives some; any honest attempt gives a little.
4. Reading is always optional and never blocks progress.

Reading difficulty follows the maths level by default and can be set separately.

Content pipeline: see [Reading Corpus Pipeline](READING_CORPUS_PIPELINE.md). The 40+ passages written for the first version are in the `defold-final` tag under `data/`.

## Progression

### World map

- Regions are operation types (Addition Grove, Subtraction Peaks, Multiplication Caverns, Division Depths).
- Nodes inside a region unlock in order and grow in number size and in the signs available.
- A player can start in any region, so they can begin at the right difficulty.

- Four regions of five levels each (20 levels). The fifth level of a region ends with its boss.
- Stars earned are saved on the device and shown on the map; replaying never lowers them.

### Level definition

Each level sets: the signs available, the sign it is teaching, the largest tile, the numbers a weakness can be, the numbers an attack can be, and its three waves of monsters.

| Region | Signs | Teaches | Dealt answers |
|---|---|---|---|
| Addition Grove | `+` | `+` | sums up to 30 |
| Subtraction Peaks | `+ −` | `−` | differences, tiles up to 30 |
| Multiplication Caverns | `+ ×` | `×` | times tables up to 12 × 12 |
| Division Depths | `+ × ÷` | `÷` | quotients up to 12 |

The dealt two-number answer always uses the sign being taught when it can. Monsters from an earlier region wander into later ones so old skills keep being used. Attacks only grow when ignored in the first two regions, where two added tiles can always answer the bigger number.

### Session design

- A level is roughly ten turns, about five minutes.
- Levels chain naturally up to about twenty minutes.

### Unlocks

- Cosmetics and consumable items. All maths content is reachable without them.

## Feel

Feel is a requirement, not polish.

- **Title screen:** key art, animated logo, music. It should make a child want to press Play.
- **Numbers** in play (tiles, chips, damage) use a custom drawn glyph set, not a stock font.
- **Sound:** every tap, hit, parry, miss and win has its own sound; music for title, battle and campfire. All audio is CC0, credited in `public/assets/audio/CREDITS.md`.
- **Motion:** attacks have a wind-up before numbers change; hits shake and flash; results pop.

## Technology

- **Why web:** the game is a turn-based tile and text interface. DOM/CSS gives crisp text at phone pixel densities, layout that adapts to any aspect ratio, and a build that can be driven and inspected automatically in a browser on every change.
- **Structure:**
  - `src/engine/` is pure and deterministic (seeded): equation rules, solver, dealing, and a battle reducer that returns a list of steps (state + what happened).
  - `src/ui/` renders the current step and plays an animation for each event before showing the next.
- **Sizing:** one rem is the smaller of 1/22.5 of the screen height or 1/40 of its width, so the whole layout scales together. Touch targets are at least 48 CSS px on an S21.
- **Checks:**
  - `pnpm test`: rules, the dealing promise, simulated players.
  - `pnpm e2e`: plays whole levels through the real interface on an emulated S21 with the CPU slowed 4×, and fails on console errors, overflow, small touch targets, slow frames or long stalls.

## Related documents

- [Wave Structure](WAVE_STRUCTURE.md) — session pacing research (written for the first version; turn timing still applies)
- [Adaptive Difficulty](ADAPTIVE_DIFFICULTY.md) — Elo-based difficulty selection (not yet rebuilt)
- [Reading Corpus Pipeline](READING_CORPUS_PIPELINE.md)
- [Art Direction](ART_DIRECTION_RESEARCH.md)
- [Recovery Balance](RECOVERY_BALANCE.md) — written for in-battle healing; the effort-based reward idea carries over to campfire items
- [Kids Game UX](KIDS_GAME_UX_RESEARCH.md), [Mobile UX](MOBILE_TABLET_UX_RESEARCH.md)

## Open questions

1. **Tuning with real children.** The simulated players are perfect or random; real play will sit between. Level length and attack sizes are the first levers.
2. **Reading corpus curation.** Pipeline designed, content needs review.
3. **Accessibility.** Colour-blind safety for the red/blue chips (icons already differ), reduced motion, screen readers.
4. **Analytics and privacy.** What to record for adaptive difficulty under COPPA / GDPR-K.
