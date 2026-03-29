# Axiom Strike — Art Direction Research

Research into visual styles, character design, and UI considerations for a 2D educational math fighting game targeting ages 6-12 with a manga + pixel art aesthetic.

---

## 1. Games That Successfully Appeal to Ages 6-12 With a Single Visual Style

### The Proven Models

**Pokemon** — The gold standard. Simple, readable silhouettes with enough detail to feel "cool" rather than babyish. Key principles:
- Every creature has a clear type communicated through color and shape (fire = warm reds/oranges, spiky; water = blues, smooth/flowing)
- Designs range from cute (Pikachu) to intimidating (Charizard) within the same visual language
- The consistent type-color coding system means a 6yo and 12yo both instantly parse what they're looking at, but derive different satisfaction from it (younger: "pretty colours", older: "I know the type matchup")

**Kirby** — Demonstrates the power of the "kawaii dissonance" strategy. The art style is deliberately cute and simple (large heads, rounded limbs, bright saturated colours), but the gameplay and lore contain genuinely challenging and sometimes dark content. This layering means younger kids enjoy the surface, while older kids appreciate the depth beneath. Kirby's bosses escalate in visual complexity and menace while remaining within the same stylistic grammar.

**Undertale** — Proves that low-resolution pixel art can carry enormous emotional range. Toby Fox's intentionally minimalistic style is *disarming* — the simplicity makes dramatic moments hit harder. Key lesson: Toriel alone has ~20 distinct facial expressions despite being rendered in very few pixels. The constraint forces focus on essential features and silhouettes, making characters universally readable. Adults and children both connect with the characters because the art leaves room for imagination.

**Yo-kai Watch** — Colorful, cartoony, and deliberately accessible. Designs vary from cute to cool within the same roster, allowing kids to gravitate toward creatures that match their taste. The friendship-based framing (befriending rather than capturing) and bright primary-colour world keep it inviting for younger players, while the strategic depth and humor land with older ones.

### Why These Work Across the Age Range

The common thread is **visual clarity + tonal range within a consistent style**:
- Simple, high-contrast character silhouettes that read at any screen size
- A spectrum from "cute" to "cool/menacing" within the same design language
- Surface-level appeal for younger kids (colour, shape, animation) with deeper systems for older kids to appreciate
- Never condescending — the world takes itself seriously even when it's lighthearted

---

## 2. Should the Visual Style "Mature" With Difficulty?

### Short Answer: One Style, With Tonal Variation

No successful game completely changes its visual style between easy and hard content. What *does* work is **tonal escalation within a fixed style**.

### What Tonal Escalation Looks Like

- **Pokemon**: Early routes have bright, pastoral environments and cute creatures. Later areas have darker palettes, more angular/complex creature designs, and moodier environments — but it's all still *Pokemon*. The art doesn't become a different game.
- **Kirby**: The first few levels are bright meadows with simple enemies. By the endgame, environments are cosmic/eldritch horror — but rendered in the same rounded, colourful style. The dissonance IS the appeal.
- **Celeste**: Uses a consistent 320x180 pixel art style throughout, but the color palettes shift dramatically (cheerful greens early on, oppressive reds/purples in anxiety-themed chapters). The resolution and art grammar stays identical; the mood changes through palette and environment design.

### Recommendation for Axiom Strike

Keep one unified art style across all difficulty levels. Use these levers to create a sense of progression:

1. **Color palette shifts** — Addition region: warm, bright, inviting. Division region: deeper, more complex colour schemes with higher contrast
2. **Enemy design complexity** — Early enemies: simple shapes, fewer details, rounder forms. Later enemies: more angular, more visual detail, more imposing silhouettes
3. **Environmental mood** — Lighter/brighter environments for early content, moodier/more atmospheric for later content
4. **Animation complexity** — Boss characters can have more elaborate idle animations and attack effects, signaling importance without changing the fundamental style

This approach respects younger players (nothing becomes scary or alienating) while giving older players the sense that they're engaging with more serious content.

---

## 3. What Does "Manga + Pixel Art Hybrid" Actually Look Like?

### Reference Games and Styles

**Scott Pilgrim vs. the World: The Game** — THE primary reference point for this hybrid. Created by pixel artist Paul Robertson, it combines:
- High-detail pixel art sprites with manga-influenced proportions (large eyes, expressive faces, exaggerated action poses)
- Manga-style impact frames and screen effects during combat
- River City Ransom-inspired sprite work with Japanese comic visual language (speed lines, impact stars, emotion symbols)
- Vibrant, saturated colour palettes
- **This is probably the closest existing reference to what Axiom Strike should look like**

**CrossCode** — 16-bit SNES-style pixel art inspired by Chrono Trigger and Seiken Densetsu 3. Anime character portraits paired with detailed pixel sprites. Demonstrates how to do expressive anime-style characters within pixel constraints. Smooth animations and particle effects give the retro sprites modern polish.

**Octopath Traveler / HD-2D style** — Pixel sprites on 3D environments with depth-of-field, dynamic lighting, and tilt-shift effects. Beautiful but likely too heavy for Defold on low-end devices. The *concept* of layered depth behind flat sprites is worth borrowing in a lighter form (parallax backgrounds, subtle lighting effects).

**Celeste** — 320x180 base resolution, 8x8 tile grid. Proves that very low-resolution pixel art can be expressive and emotionally resonant. Uses high-resolution character portraits for dialogue (distinct from in-game sprites), which is a useful technique for Axiom Strike's conversation scenes.

### Concrete Hybrid Approach for Axiom Strike

The recommended hybrid formula:

1. **In-game sprites**: Mid-resolution pixel art (think 32x32 to 64x64 character sprites), manga-influenced proportions (slightly large heads, expressive eyes even at low res)
2. **Character portraits** (for dialogue/story scenes): Higher-resolution manga-style illustrations, hand-drawn feel. This is where the "manga" side of the hybrid lives most strongly. Reference: Celeste's portrait system, CrossCode's character art
3. **Combat effects**: Manga visual language — speed lines, impact bursts, screen shake, numbered damage popups with stylized fonts. These sell the "fighting game" feel
4. **UI elements**: Clean, slightly stylized. Can use manga panel framing for menus and dialogue boxes
5. **Environments**: Pixel art tilesets with parallax scrolling for depth. Keep it lightweight for Defold/low-end devices

### The Key Insight

"Manga + pixel art" doesn't mean every element is both manga AND pixel art simultaneously. It means pixel art as the base rendering style, with manga as the *design sensibility* (proportions, expressions, action choreography, visual effects vocabulary).

---

## 4. Character Design Principles for Math Enemies That Feel Cool

### The Core Problem

Most educational math games (Prodigy, Monster Math, Math Land) use generic fantasy enemies that happen to be beaten by answering math questions. The math is an *interruption* of the game, not *part* of the character. Axiom Strike's design doc already has a better idea: enemies whose classes map to operations and whose designs communicate their weakness number.

### Design Principles

**A. Make the math visually intrinsic to the character**
- An addition enemy doesn't just "require addition to defeat" — its body language, silhouette, and visual motifs ARE addition. Merged/combined forms, symmetrical compositions, characters that look like two things fused together
- A subtraction enemy looks like something being taken away — cracked, fractured, incomplete, hungry/consuming
- Multiplication enemies could be swarm-like, self-replicating, fractal, or have repeating patterns
- Division enemies could be segmented, split, modular, or have clear internal divisions

**B. Personality over cuteness**
- Prodigy Math succeeds partly because its creatures have distinct personalities communicated through pose, expression, and animation — not because they're cute or scary
- Give every enemy an *attitude*. A cocky addition slime. A brooding subtraction knight. An anxious multiplication swarm. The personality makes them memorable, not the visual complexity
- The game design doc already nails this: "the enemy meets the hero and shows off an over-the-top personality"

**C. The "cool silhouette" test**
- Every enemy should be identifiable from its silhouette alone. This is a core principle from Pokemon and Kirby design
- At small mobile screen sizes, detail is lost. Shape language is everything
- Round/soft shapes = lower difficulty, approachable. Angular/complex shapes = higher difficulty, more threatening

**D. Reference the right "cool"**
- For ages 6-12, "cool" means: confident poses, dynamic action, a hint of danger, and visual spectacle
- NOT "cool" for this audience: realistic violence, excessive edge, gritty textures
- Think Mega Man bosses (memorable names, clear visual themes, distinct attack patterns communicated through design) crossed with Pokemon gym leaders (personality-driven, type-themed, escalating in presence)

**E. Weakness number as visual storytelling**
- The weakness number should be embedded in the character design itself (as noted in the GDD)
- A "7" weakness could be a seven-armed creature, a character with 7 visible gems/crystals, or a figure whose silhouette suggests the number
- This turns reading the enemy into a puzzle itself — another layer of engagement

### Enemy Class Visual Language Summary

| Operation | Shape Language | Motion/Pose | Color Temperature | Personality Archetypes |
|-----------|---------------|-------------|-------------------|----------------------|
| Addition | Merged, combined, symmetrical, growing | Expansive, welcoming, accumulating | Warm (inviting) | Collector, builder, hoarder |
| Subtraction | Fractured, incomplete, consuming | Aggressive, taking, retreating | Cool (absence) | Thief, ghost, eraser |
| Multiplication | Repeating, fractal, swarm, patterned | Rapid, multiplying, echoing | Intense, saturated | Trickster, mimic, legion |
| Division | Segmented, split, modular, precise | Precise, cutting, analytical | Sharp contrasts | Surgeon, judge, architect |

---

## 5. Color Palette Considerations for Operation Types

### Guiding Principles

From Pokemon's type system: **instant readability at a glance**. Players should know what operation they're dealing with from color alone, even before reading any text. This is critical for the 6yo end of the spectrum who may not read fluently.

From game UI color theory: **warm colors = action/energy, cool colors = calm/precision**. Operations can be mapped onto this spectrum based on their cognitive "feel."

### Recommended Operation Color Palettes

**Addition — Green/Teal**
- Association: Growth, combining, building up, nature
- Why: Addition is the most "constructive" operation. Green universally codes as positive/growth
- Palette: Forest greens, teals, with gold/yellow accents for energy
- Avoids: Red (too aggressive for the simplest operation)

**Subtraction — Blue/Purple**
- Association: Removal, mystery, depth, the unknown
- Why: Subtraction is about what's missing — cooler tones evoke absence and space
- Palette: Deep blues, purples, with white/silver accents for the "gap"
- The slight eeriness of purple suits subtraction's "taking away" theme

**Multiplication — Red/Orange**
- Association: Energy, intensity, rapid growth, fire
- Why: Multiplication makes numbers explode in size — it's the most energetic operation
- Palette: Warm reds, oranges, amber, with bright yellow sparks
- This maps to the intuitive feeling that multiplication is "big" and "powerful"

**Division — Yellow/Gold → White**
- Association: Precision, clarity, light, splitting, analysis
- Why: Division requires precision and produces clean results. Light/gold suggests illumination and exactness
- Palette: Golds, whites, clean yellows, with sharp black line accents
- The precision of division maps well to high-contrast, clean palettes

### Color Coding in Educational Context

Research confirms that **consistent color-coding helps students make connections faster**. Once players associate green with addition and red with multiplication, they build automatic recognition. This is the same principle behind Pokemon's type badges.

### Implementation Notes

- Each operation's world map region should be dominated by its color palette
- Enemy designs within an operation class share the palette but vary in shade/saturation with difficulty
- UI elements (tiles, damage numbers, effects) should echo the current operation's palette
- Ensure sufficient contrast between all four palettes for colorblind accessibility — test with deuteranopia and protanopia filters

---

## 6. UI/UX Considerations for 6yo vs 12yo on the Same Interface

### Touch Target Sizes

Research from Nielsen Norman Group and multiple UX studies:

| Element | Minimum Size | Recommended Size | Notes |
|---------|-------------|-----------------|-------|
| Number/operator tiles | 48x48 dp | 56-64 dp | Primary interaction element — err large |
| Action buttons | 48x48 dp | 48-56 dp | Submit, end turn, menu |
| Spacing between tiles | 8-12 dp gap | 12-16 dp gap | Prevents mis-taps; critical for 6yo motor skills |
| Text size | 18sp minimum | 24sp for primary content | Body text, enemy stats, numbers |
| Icons | 60x60 px | 60-80 px | Menu icons, status indicators |

### The Two-Track Problem

The core tension: 6-year-olds need bigger, simpler, more guided interfaces. 12-year-olds need efficiency and will reject anything that feels "baby."

**Solution: One interface that scales gracefully, not two separate UIs.**

### Design Strategies

**A. Progressive disclosure**
- Start with large, simple tile layouts. As difficulty increases, tiles can be slightly smaller and more numerous (the player's skill has grown with them)
- Don't show advanced UI elements (timer mode toggle, impossible mode) until the player has demonstrated mastery of basics
- This is NOT hiding content — it's reducing cognitive load for younger players while keeping the advanced path available

**B. Information layering**
- Primary layer (always visible): The equation being built, the target number, health bars. Big, bold, high-contrast
- Secondary layer (visible on demand): Detailed stats, history of previous equations, enemy information. Accessible via tap but not cluttering the main view
- Younger kids interact only with the primary layer. Older kids naturally discover and use the secondary layer

**C. Text + icons for everything**
- Every operation and action should be represented by BOTH an icon and text
- 6yo players navigate by icon recognition. 12yo players read text. Both work simultaneously
- The operator tiles themselves serve as icons (+ - x /) which are universally recognised

**D. Font and readability**
- Use a single clear, slightly rounded sans-serif font (not a "kiddy" handwriting font — that's what makes things look babyish)
- Numbers should be rendered in a distinctive, game-specific font that's bold and readable at small sizes
- Minimum 24pt for all numbers the player needs to read during combat

**E. Responsive layout for device variance**
- Design for the smallest supported screen first (phone in portrait), then scale up for tablets
- Tile grid should reflow based on available space, not use fixed positions
- Test on actual low-end devices — this audience is on hand-me-downs

### The Celeste Model for Portraits

Use two visual registers like Celeste does:
- **In-game**: Pixel art sprites at game resolution
- **Dialogue/story scenes**: Higher-resolution manga-style character portraits with visible expressions
- This lets you have expressive storytelling moments without the pixel art needing to carry all the emotional weight

---

## 7. Solving the "Too Babyish for Older Kids" Problem

This is the central design challenge for Axiom Strike's visual identity. Research points to several converging strategies:

### A. Target the 10-Year-Old, Not the 6-Year-Old

Design the visual identity for a 10-year-old's taste, then ensure it's accessible to 6-year-olds through UX accommodations. A 6-year-old will happily play a game that looks "cool and grown-up." A 12-year-old will never play a game that looks "babyish." **Always design up, accommodate down.**

This is exactly what Pokemon does. The aesthetic targets ~10yo. Younger kids aspire to it. Older kids/adults find it charming rather than childish.

### B. Dark UI, Vibrant Content

UX research on tweens (ages 8-12) shows they are drawn to:
- Dark/deep base colours in UI (think Discord, Twitch — not bright white backgrounds)
- High-contrast accent colours that pop against dark backgrounds
- Clean, "professional" feeling interfaces rather than bubbly/rounded ones

This doesn't mean making the game dark or moody. It means the **UI frame** (menus, HUD, tile tray) uses a sophisticated dark palette, while the **game world** inside that frame is vibrant and colourful. Think of it as a sleek picture frame around a lively painting.

### C. Avoid These Specific "Baby" Signals

Research identifies specific triggers that make tweens immediately reject an experience:
- Primary colours in large flat blocks (the Fisher-Price look)
- Exaggerated bouncy animations on UI elements
- Handwriting/crayon-style fonts
- Talking animal mascots that explain everything
- Excessive stars/sparkles/rainbows as rewards
- Voice-over narration in a "talking to children" tone

### D. Embrace These "Cool" Signals

- Character customization (avatar creator, cosmetic unlocks)
- A sense of mastery and competence (the game trusts the player)
- Visual spectacle in combat (screen shake, particle effects, impact frames)
- Manga/anime visual language inherently codes as "cool" for this age range
- Enemy characters with personality and attitude, not just generic baddies
- A world that takes itself seriously (even if it has humor)

### E. The "Aspiration Gap"

The most effective strategy is creating content that younger players *aspire to*. When a 6-year-old sees the Division region on the world map and it looks complex and impressive, they *want* to get there. When a 12-year-old is in that region, they feel they've earned access to the "real" game.

This is the same psychology that makes Pokemon's Elite Four exciting for all ages — it's visually grander and tonally more serious, creating a sense of earned progression.

### F. Specific Recommendations for Axiom Strike

1. **Art style**: Lean into the manga influence. Manga/anime is universally "cool" for ages 6-12 across your target markets (UK, Canada, Australia, USA). It doesn't read as childish the way Western cartoon styles can
2. **Character design**: Protagonist should look ~10-12yo. Confident, not cutesy. Think early Naruto or Deku (My Hero Academia) — aspirational for younger kids, relatable for older ones
3. **Enemy personality**: Over-the-top villain energy. Hammy, theatrical, memorable. Not menacing — entertaining. Think Saturday morning anime villains
4. **Combat feel**: Satisfying visual feedback. Screen shake, particle effects, manga speed lines. Make getting the right answer feel POWERFUL, not just "correct"
5. **Sound design**: Punchy, dynamic sound effects. Avoid "ding ding!" reward sounds. Use impact sounds, combo sounds, power-up crescendos
6. **World presentation**: The world map should look like an adventure map, not a learning roadmap. Regions should feel like places you want to explore, not curriculum modules
7. **Never call it educational in-game**: The marketing can say educational. The game itself should just be a game. The moment the UI says "Great job learning!" the 12-year-old uninstalls

---

## Summary of Key Decisions

| Decision | Recommendation | Primary Reference |
|----------|---------------|-------------------|
| Core visual style | Pixel art sprites + manga design sensibility | Scott Pilgrim, CrossCode |
| Character portraits | High-res manga illustrations for dialogue | Celeste's dual-register approach |
| Does style "mature"? | No — one style, tonal escalation through palette and complexity | Pokemon, Kirby |
| Target aesthetic age | Design for 10yo, accommodate 6yo through UX | Pokemon's design philosophy |
| UI base | Dark/deep UI frame, vibrant game world | Tween UX research, Discord/Twitch conventions |
| Operation color coding | Green (add), Blue-purple (sub), Red-orange (mul), Gold-white (div) | Pokemon type system, color theory |
| Touch targets | 56-64dp tiles, 12-16dp gaps, 24sp+ text | NNGroup children's UX research |
| Enemy design philosophy | Math intrinsic to visual design, personality-driven, cool silhouettes | Mega Man bosses x Pokemon gym leaders |
| Combat feel | Manga visual language (speed lines, impacts, screen shake) | Scott Pilgrim, shonen anime |
| Avoiding "babyish" | Dark UI, no primary-color blocks, no patronizing tone, never label as educational in-game | Tween UX research |

---

## Sources

- [Scott Pilgrim Art Style Guide — Gilnorton](https://gilnorton.com/scott-pilgrim-art-style-guide/)
- [Scott Pilgrim vs. the World: The Game pixel art — Stephane Boutin / Behance](https://www.behance.net/gallery/104083575/SCOTT-PILGRIM-VS-THE-WORLD-THE-GAME-Ubisoft-2010?locale=en_US)
- [HD-2D — Wikipedia](https://en.wikipedia.org/wiki/HD-2D)
- [Kirby Art Style Influences — Snooze Station](https://snoozestation.wordpress.com/2018/02/03/historical-contemporary-and-contextual-influences-of-the-kirby-video-game-series-art-style/)
- [Undertale Graphic Style Discussion — Steam Community](https://steamcommunity.com/app/391540/discussions/0/360671583802090568/)
- [Undertale Pixel Art Polish — Steam Community](https://steamcommunity.com/app/391540/discussions/0/490123197944389063/)
- [Celeste Tilesets — Aran P. Ink](https://aran.ink/posts/celeste-tilesets)
- [Celeste — Wikipedia](https://en.wikipedia.org/wiki/Celeste_(video_game))
- [CrossCode — Radical Fish Games Presskit](https://www.radicalfishgames.com/presskit/sheet.php?p=crosscode)
- [Pokemon Type Color Guide + Hex Codes — PokemonAaah](https://www.pokemonaaah.net/art/colordex/)
- [Yo-kai Watch Review — Source Gaming](https://sourcegaming.info/2016/05/23/yo-kai-watch-review/)
- [Design for Kids Physical Development — Nielsen Norman Group](https://www.nngroup.com/articles/children-ux-physical-development/)
- [Children's UX Usability Issues — Nielsen Norman Group](https://www.nngroup.com/articles/childrens-websites-usability-issues/)
- [Designing for Kids UX Tips — Ungrammary](https://www.ungrammary.com/post/designing-for-kids-ux-design-tips-for-children-apps)
- [UX for Gen Alpha Preteens — Bitskingdom](https://bitskingdom.com/blog/ux-design-gen-alpha-preteens/)
- [Effective Use of Color for Children 7-14 — UXmatters](https://www.uxmatters.com/mt/archives/2011/12/effective-use-of-color-and-graphics-in-applications-for-children-part-ii-kids-7-to-14-years-of-age.php)
- [Color Coding Math Classrooms — Teaching in Room 5](https://teachinginroom5.com/color-coding-your-math-classroom/)
- [Colors in Game UI — Dakota Galayde](https://www.galaydegames.com/blog/colors-i)
- [Prodigy Math Gamification Case Study — Trophy](https://trophy.so/blog/prodigy-math-game-gamification-case-study)
- [Why We Love Prodigy Math — Arts and Bricks](https://artsandbricks.com/why-we-love-the-prodigy-math-game-for-elementary-aged-kids/)
- [Yo-kai Watch Marketing to Japanese Children — Tofugu](https://www.tofugu.com/japan/yo-kai-watch/)
- [Shape Language in Game Design — Polydin](https://polydin.com/art-direction-in-video-games/)
