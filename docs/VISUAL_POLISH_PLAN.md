# Visual Polish Plan

Synthesized from three research agents covering Defold techniques, kids' game design patterns, and art-without-artists approaches.

## Key Insight

**Motion and feedback matter more than detail.** A rectangle with eyes that bounces, shakes, and emits particles when hit will be more engaging to a 6-year-old than a beautifully drawn static sprite.

## Prioritized Actions

### Tier 1 — Pure animation, zero assets (implement now)

| Action | Impact | Effort |
|---|---|---|
| **Scale bounce on every tap** — tiles, buttons, enemies all pop 120% then settle with OUTBACK | Highest | 30 min |
| **Screen shake on damage** — offset root by ±4-8px for 0.3s, decaying | High | 30 min |
| **Color flash on hit** — enemy flashes white for 1 frame on damage | High | 15 min |
| **Staggered entrances** — tiles/enemies cascade in with 50-80ms delays using OUTBACK | High | 30 min |
| **Star twinkling** — randomized alpha pulse on existing stars | Medium | 10 min |
| **Tile wiggle** — slight ±3° rotation oscillation on idle tiles | Medium | 15 min |
| **Breathing pulse** — gentle 2-3% scale oscillation on characters | Medium | Already done (bob) |
| **Anticipation animation** — enemy pulls back before attacking | Medium | 20 min |

### Tier 2 — Better backgrounds, zero assets

| Action | Impact | Effort |
|---|---|---|
| **Runtime gradient background** — use `gui.new_texture()` for vertical gradient sky (deep navy → purple) | High | 30 min |
| **Silhouette hills** — 2-3 wide low-opacity rectangles at horizon as distant landscape | High | 20 min |
| **Floating ambient particles** — tiny slow-drifting squares, low opacity, recycling | Medium | 30 min |
| **Moon** — large low-alpha circle (pie node or box) in sky | Low | 10 min |

### Tier 3 — One tiny PNG unlocks huge value

| Action | Impact | Effort |
|---|---|---|
| **32x32 white rounded-rect PNG** — use with Slice9 on every panel/button, color-tint per node | Highest | 1 hour |
| **Drop shadows** — 4px offset darker box behind each character/tile | High | 30 min |

### Tier 4 — Particle effects (built-in particle_blob.png)

| Action | Impact | Effort |
|---|---|---|
| **Hit sparkles** — yellow/white additive particles on damage | High | 30 min |
| **Correct answer celebration** — gold particle burst | High | 30 min |
| **Healing glow** — green particles drifting up during recovery | Medium | 20 min |

### Tier 5 — Free asset packs for real sprites

| Pack | License | URL | Use |
|---|---|---|---|
| **Ninja Adventure** | CC0 | pixel-boy.itch.io/ninja-adventure-asset-pack | Characters, enemies, effects (400+ sprites) |
| **Kenney UI Pack RPG** | CC0 | kenney.nl/assets/ui-pack-rpg-expansion | HP bars, panels, buttons |
| **Kenney Particle Pack** | CC0 | kenney.nl/assets/particle-pack | Particle sprites |
| **Monsters Creatures Fantasy** | Free | luizmelo.itch.io/monsters-creatures-fantasy | Animated enemies |

### Color Palette (research-backed for ages 6-12)

| Role | Color | Hex |
|---|---|---|
| Player / positive | Bright blue | #3498FF |
| Enemy / threat | Warm red-orange | #FF4444 |
| Reward / success | Gold yellow | #FFD700 |
| Accent / magic | Electric purple | #9B59FF |
| Background base | Deep navy (NOT black) | #1A1A3E |
| Text | Warm off-white | #FFF8E7 |

## Rules

- Never use pure black (#000) as background — use deep navy/purple
- Never use pure white (#FFF) for text — use warm off-white
- Button touch targets minimum 60px for kids
- Maximum 6-8 words per instruction line
- Important numbers should be 2-3x the size of labels
