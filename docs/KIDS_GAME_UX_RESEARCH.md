# Kids Game UX Research

Practical insights from GDC talks, postmortems, and published design patterns for kids' educational games.

## Top 10 Takeaways for Axiom Strike

1. **Equation construction must feel like combat, not homework.** Tile placement needs snap, weight, sound. Completing an equation = charging an attack.
2. **First 5 minutes: constrained play.** One enemy, one operation, tiles that can only form one correct answer. Open up gradually.
3. **Wrong answers: show what the equation equals, then let the enemy take a short, gentle turn.** "2+6=8, but the weakness is 5!" Keep enemy attack animations under 1 second.
4. **60x60pt minimum touch targets.** Generous snap-to for any drag interactions.
5. **Voice-over for all tutorial and story content.** Manga companion character narrates everything.
6. **2-4 minute battles with clear stopping points on the world map.**
7. **Collection system as reward** — unlockable equation effects, character customization, enemy gallery. Not currency or points.
8. **Auto-hint system** — glow at 5s, point at 10s, partial solve at 15s. Never leave a kid staring.
9. **Reactive audio** — every tap, placement, completion has a unique sound. Layer combat music. Must work muted.
10. **No timers on core equation building.** Timing elements should be generous with mild consequences.

## Detailed Findings

### From Prodigy Math
- Math as currency, not punishment — answering questions earns spells/actions
- Adaptive difficulty is non-negotiable — 3+ wrong in a row triggers difficulty drop
- Social proof drives engagement

### From DragonBox
- Remove math notation at the start — teach rules before symbols
- One concept per screen — never two new ideas simultaneously
- Instant feedback with physicality — manipulation feels tactile

### From Khan Academy Kids
- No failure state for youngest users (ages 6-7)
- Character companions narrate everything — replaces ALL instructional text
- Sticker/collectible rewards more engaging than points

### From PBS Kids
- **3-tap rule:** Launch → tap → playing. No account creation, no splash screens.
- No dead ends — every screen has an obvious "what next" affordance
- Design for parallel play (parent/sibling watching)

### From Toca Boca
- No scores, no time limits, no fail states → kids explore more and learn more
- Sound design carries 50% of the experience

## Onboarding Patterns That Work

1. **Forced first move** — only one correct action possible. DragonBox, Cut the Rope.
2. **Diegetic tutorials** — companion demonstrates, then "your turn!" All animation, no text.
3. **Progressive disclosure** — one new concept per encounter in first world.
4. **Contextual hints with escalation:**
   - 5s: subtle glow on next action
   - 10s: companion points/gestures
   - 15s: companion says "try putting the 2 here!"
   - 20s: auto-complete with ghosted hand
5. **Celebrate the tutorial itself** — learning gets the same fanfare as winning.

## Handling Wrong Answers

- Show what the equation equals: "2+5=7, but we needed 5"
- After 2 wrong: simplify the problem (offer easier numbers, highlight helpful tile)
- After 3 wrong: solve partially, let kid complete last step
- NEVER let a kid fail the same problem 5+ times
- No permanent consequences — no score reduction, no lost items
- Enemy attacks framed as "enemy got a turn" not "you were punished"
- Keep enemy attack animations SHORT (under 1 second)

## Session Design

- 2-4 min battles for ages 6-8, up to 5-7 min for ages 10-12
- Clear "continue or stop" moment on world map between battles
- Never end on a loss — offer an easy bonus round
- Cold open: resume exactly where the kid left off
- Auto-save constantly — kids get pulled away mid-battle
- Daily goal achievable in 15-20 minutes as natural stopping point

## Accessibility

- **Touch targets:** 60x60pt minimum, 80x80 hit boxes
- **Gestures:** Single tap and simple drag only — no double-tap, long-press, or complex swipes
- **Reading:** Voice-over for instructions, icons over text, 24pt min font, 5-7 word max
- **Audio:** Every interaction needs a sound. Must be fully playable muted.
- **Movement:** Something moving on screen at all times — static = "nothing happening" to a kid

## Anti-Patterns to Avoid

1. Math as gate to fun (ours is correct — math IS the combat)
2. Punitive wrong-answer feedback (buzzers, red X, losing lives)
3. Too many menus (world map IS the menu)
4. Forced text reading for comprehension (use show-don't-tell)
5. Sudden difficulty spikes (gentle continuous ramp)
6. Ignoring left-handedness (center critical UI)
7. Rewarding speed over accuracy (generous timers, mild timeouts)
8. Unskippable animations (let kids tap to skip after first viewing)
9. No offline support (must work without internet)
10. Dark patterns (none — we're paid upfront)
