# Axiom Strike

## Project Overview

Educational math fighting game for phones/tablets (Android + iOS, landscape), targeting ages ~6-12.

- **Stack:** TypeScript + Vite + Preact, DOM/CSS rendering, packaged with Capacitor. The original Defold/Lua build is preserved only as the git tag `defold-final`.
- **Device floor:** base Samsung Galaxy S21 and newer
- **Art style:** bright pixel art with manga energy, generated as one consistent set (sources in `art-src/`)
- **Monetisation:** Upfront paid, structured for future operation-type DLC (nothing gated in v1)
- **Target markets:** UK, Canada, Australia, USA

## Commands

- `pnpm dev` — dev server
- `pnpm test` — engine rules, dealing promise, simulated players (vitest)
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm build && pnpm preview --port 5198` then `BASE_URL=http://localhost:5198/ pnpm e2e` — plays whole levels through the real UI on an emulated S21 with 4x CPU throttle; fails on console errors, overflow, small touch targets, slow frames, long stalls. Set `SHOT_DIR=.ai-cache/shots` to save screenshots, and look at them.

- `pnpm android` — debug APK (needs `JAVA_HOME` and `ANDROID_HOME`; see README)

## Layout

- `src/engine/` — pure, seeded, no DOM. `battle.ts` is a reducer returning steps (state + event).
- `src/ui/` — Preact components; `store.ts` plays steps one at a time; `fx.ts` animates each event.
- `tests/` — vitest, including policy bots in `bots.ts` that guard game balance.
- `e2e/` — Playwright playthrough: title → map → a level in each region.
- `android/` — Capacitor project. `android/local.properties` is machine-specific and not committed.

## Working rules

- Any rule change goes in `docs/GAME_DESIGN.md` in the same change. That doc describes the game as built.
- Balance changes must keep the simulated-player tests passing; if a threshold has to move, say why.
- Visual changes are not done until a screenshot at 800x360 has been looked at.
- Sizes are in rem (1rem = min(height/22.5, width/40)). Touch targets stay >= 3rem.
- All audio and art must be CC0 or generated for this project; credit audio in `public/assets/audio/CREDITS.md`.

## Key Documents

- [Game Design Document](docs/GAME_DESIGN.md) — rules as built, pillars, open questions
- [Wave Structure](docs/WAVE_STRUCTURE.md) — session pacing research
- [Adaptive Difficulty](docs/ADAPTIVE_DIFFICULTY.md) — Elo-based algorithm (not yet rebuilt)

## Not built yet

Campfire reading, enemy intro scenes, adaptive difficulty, settings (mute, reset progress), iOS project.
- [Reading Corpus Pipeline](docs/READING_CORPUS_PIPELINE.md) — PD sources, chunking, question generation
- [Art Direction](docs/ART_DIRECTION_RESEARCH.md) — visual style, colour palettes, age-spanning design
- [Recovery Balance](docs/RECOVERY_BALANCE.md) — effort-based reward idea, now applied to campfire items
