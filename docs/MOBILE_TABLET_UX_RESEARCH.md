# Mobile & Tablet Game UX Research

Practical guidelines for touch-based games targeting kids ages 6-12 on tablets and phones.

## Thumb Zones (Landscape, Two-Handed)

```
┌─────────────────────────────────────────────┐
│  HARD        MODERATE         HARD          │  <- Top: HUD info only
│  MODERATE    EASY (visual)   MODERATE       │  <- Middle: game world
│  EASY        EASY             EASY          │  <- Bottom: ALL controls
│  (L thumb)   (either thumb)   (R thumb)    │
└─────────────────────────────────────────────┘
```

All interactive elements in the bottom third. Battle visuals in the middle. HUD at top.

## Touch Target Sizes

| Element | Minimum | Recommended | Notes |
|---|---|---|---|
| Number/operator tiles | 64dp | 72-80dp | Primary gameplay, needs to be easy |
| Attack/confirm button | 80dp | 96dp+ | Must be unmissable |
| Answer options (recovery) | 64dp tall | Full width | Large rectangles |
| Menu buttons | 60dp | 72dp | |
| Gap between targets | 8dp | 12-16dp | Prevents mis-taps for young kids |

## Gestures That Work by Age

| Gesture | Ages 6-8 | Ages 9-12 | Recommendation |
|---|---|---|---|
| Tap | Excellent | Excellent | Primary interaction |
| Drag | Good | Excellent | Optional enhancement |
| Swipe | Moderate | Good | Navigation only |
| Long press | Poor | Moderate | Never for primary actions |
| Double tap | Poor | Moderate | Avoid entirely |
| Multi-touch | Poor | Moderate | Avoid entirely |

## Screen Layout Pattern

```
┌──────────────────────────────────────────────────────┐
│ [HP]               [Wave/Phase]          [Enemy HP]  │  Top HUD
│                                                      │
│   PLAYER           BATTLE AREA             ENEMY     │  Game world
│                                                      │
├──────────────────────────────────────────────────────┤
│  [Tile][Tile][Tile][Tile][Tile]     [ATTACK! ▶]      │  Controls
│  [ equation display ]               [undo] [clear]   │
└──────────────────────────────────────────────────────┘
```

## Aspect Ratio Strategy

- Design for **16:9** (1280x720 logical) as reference
- 4:3 tablets: extra vertical space → extend sky background
- 20:9 phones: extra horizontal space → extend background
- Use Defold `fixed_fit` projection with extended backgrounds

## Performance Targets

- **60 FPS** during battles (achievable in Defold 2D)
- **Touch-to-feedback under 50ms** (1-2 frames at 60 FPS)
- **Loading screens under 2 seconds** — pre-load during summary screens
- **30 FPS** on menus/map to save battery

## Critical Mobile Pitfalls

- **Edge safe area**: 20dp inset from all edges — never place buttons near screen edges
- **Disable input during transitions**: 200-300ms lockout after actions
- **Auto-pause on focus loss**: save state instantly when app backgrounded
- **Auto-save after every battle**: kids get pulled away unpredictably
- **No network dependency**: full offline play, local saves only
- **Parental gate** required for settings/links (COPPA/GDPR-K compliance)

## Key Takeaways for Axiom Strike

1. Lock landscape, design for two-handed tablet grip
2. 72-80dp tiles with 12dp gaps — this determines if 6-year-olds can play
3. Tap-only primary interaction, drag as optional shortcut
4. Bottom-third interaction zone, middle for visuals, top for HUD
5. Instant touch feedback (scale bounce + sound) within 1-2 frames
6. Full offline play, auto-save, no accounts required
7. Test on both 4:3 tablet and 20:9 phone aspect ratios early
