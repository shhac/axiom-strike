# Axiom Strike

## Project Overview

Educational math fighting game for tablets/phones (Android + iOS), targeting ages ~6-12.

- **Engine:** Defold (Lua scripting) — chosen for tiny APK (~2-5MB), free license, low-end device optimisation
- **Art style:** Manga + pixel art, 2D with perspective
- **Monetisation:** Upfront paid, structured for future operation-type DLC (nothing gated in v1)
- **Target markets:** UK, Canada, Australia, USA

## Key Documents

- [Game Design Document](docs/GAME_DESIGN.md) — full mechanics, progression, open questions
- [Wave Structure](docs/WAVE_STRUCTURE.md) — session pacing, enemy counts, timing
- [Adaptive Difficulty](docs/ADAPTIVE_DIFFICULTY.md) — Elo-based algorithm, cold start, signals
- [Reading Corpus Pipeline](docs/READING_CORPUS_PIPELINE.md) — PD sources, chunking, question generation
- [Art Direction](docs/ART_DIRECTION_RESEARCH.md) — visual style, color palettes, age-spanning design
- [Recovery Balance](docs/RECOVERY_BALANCE.md) — effort-based HP recovery formula, failure framing

## Core Mechanics Summary

- **Attack:** Construct equations from number/operator tiles to match enemy weakness numbers
- **Defend:** Decompose enemy attack numbers via equation construction (same core skill)
- **Recovery:** Timed reading comprehension of public domain educational text → multiple choice for HP recovery
- **Progression:** World map with operation-type regions, nodes scale in number complexity
- **Mini-games:** Speed fill-in-the-blank math rounds

## Open Questions

See the "Open Questions" section in the game design doc. Key unknowns: wave/level balancing, reading corpus pipeline, adaptive difficulty algorithm, art direction specifics.
