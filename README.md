# Axiom Strike

A 2D turn-based educational math fighting game for tablets and phones. Players construct equations to attack enemies and defend against them. Built with [Defold](https://defold.com/).

**Target audience:** Ages 6-12
**Platforms:** Android, iOS
**Art style:** Manga medieval with steampunk elements (placeholder graphics for now)

## Getting Started

1. Install the [Defold editor](https://defold.com/download/) (v1.12+)
2. Open the project: File > Open Project > select `game.project`
3. Build and run: Project > Build (Cmd+B / Ctrl+B)

## Project Structure

```
game.project              Defold config (1280x720 landscape)
main/                     Bootstrap collection + screen controller
menu/                     Title screen
battle/                   Battle screen (GUI + state machine)
modules/                  Shared Lua logic
  equation.lua              Equation evaluation (left-to-right)
  tiles.lua                 Solvable tile hand generation
  damage.lua                Closeness-based damage calculation
  constants.lua             Shared config values
docs/                     Design documentation
  GAME_DESIGN.md            Full game design document
  WAVE_STRUCTURE.md         Session pacing + enemy counts
  ADAPTIVE_DIFFICULTY.md    Elo-based difficulty algorithm
  READING_CORPUS_PIPELINE.md  Public domain text sourcing
  ART_DIRECTION_RESEARCH.md   Visual style research
  RECOVERY_BALANCE.md       HP recovery mechanic balancing
  mockups/                  SVG concept mockups
```

## Current State

**Phase 1 complete:** Single-enemy battle prototype with title screen. Tap number/operator tiles to build equations, strike to deal damage based on closeness to enemy weakness, defend by matching the enemy's attack number.

**Upcoming:**
- Phase 2: Multiple enemies per wave, 3 waves per level
- Phase 3: World map with progression nodes
- Phase 4: Reading comprehension recovery mechanic
- Phase 5: Adaptive difficulty (Elo per skill)
