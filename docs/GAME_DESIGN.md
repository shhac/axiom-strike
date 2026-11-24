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
- A small pet beside the hero, once one has been won from a chest. It changes nothing about the fight, but it takes part: it hops with a star over its head for an exact strike, a block or a knockout, cowers when the hero is hurt, shivers with a `!` while an attack is about to land, dances at a win and droops at a loss.
- Above each monster, two tappable chips:
  - **Weakness** (sword): the number that hurts it.
  - **Attack** (claw marks): the number it will hit for, and how many turns until it lands.
- Sword and shield belong to the hero only. Aiming at a weakness puts a sword and the number to make on the big button, which reads **STRIKE!**; aiming at an attack puts a shield and that number there, and it reads **BLOCK!**. The chips above a monster show what the monster has (a weak spot, a claw), the panel shows what the hero does about it.
- A hand of **seven number tiles**, dealt fresh every turn.
- The control panel: **STRIKE!** fills the whole right-hand end, two rows tall, so a thumb reaching for it cannot land on anything else, and it carries the number to make (sword or shield above it). Impossible! and Hint are stacked at the far left. The equation has the rest of the top row to itself; tiles and signs sit underneath.
- The level's **operator signs**. Signs are always available and are not used up. A level with one sign (e.g. only `+`) applies it automatically, so the youngest players just tap numbers.

### Building an equation

- Tap a chip to choose what to aim at. The aimed chip grows and glows gold and every other chip dims, so the number to make stands out; an attack landing this turn dims less, so the danger still shows. The game always starts a turn aimed at a weakness that the hand can make exactly.
- Tap tiles (and signs, when there is more than one) to build `number sign number sign number …`.
- Each sign applies to the **total so far**, and the running total is always on screen.
- The equation is written so that it is true under the usual order of operations: picking `×` or `÷` after a `+` or `−` wraps everything so far in brackets, so `1 + 1` then `× 2` shows `(1 + 1) × 2 = 4`, never `1 + 1 × 2 = 4`. The brackets appear the moment the sign is picked. There is no way to build `1 + (1 × 2)`; the player multiplies first and adds after (`1 × 2 + 1`).
- Division only ever gives whole numbers: a divide that would leave a fraction is refused, and the hand always holds a pair that divides exactly.
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

- Only numbers that were needed count. `3 + 4 + 5 − 5` is a two-number seven: adding a number and taking it away again earns nothing. Padding never costs anything either: `6 × 1` is still a right answer and hits as a two-number six.
- A monster that survives an exact hit **changes its weakness**, so no sum is repeated.
- Monster health: minion 20, standard 40, boss 100.

### Block (aimed at an attack)

The code calls this a parry; on screen it is always "block", which a six-year-old can read.

- **Exact:** the attack is cancelled, the monster is staggered (it starts a new attack from scratch) and takes a counter hit of 5 per number used.
- **Close:** the attack is softened by how close the answer was, but never by more than half.
- An attack lands for its number. An attack of 9 that nobody parried costs 9 health.
- A monster whose attack was ignored completely gets angrier: its next attack number is 2 higher (up to three times).

### Turn structure

- Tiles are used up when cast. The player may cast several equations in a turn.
- The turn ends when the player taps **Pass**, or automatically when fewer than two tiles are left.
- **Pass is not on screen at the start of a turn.** It takes the place of the Impossible! button once a call has been wrong that turn, so the way to pass is: say whether the number can be made, and then, if still stuck, pass. A turn cannot be given away by one stray tap, and the new button ignores taps for its first 0.7 seconds so a double tap on Impossible! cannot do it either.
- **The Pass button says what passing does.** Under the word it reads "New numbers" with an hourglass; when a monster is ready to attack it turns red, shows a claw and reads "They attack!".
- Then each monster's countdown drops by one; any that reach zero attack. Monsters attack every two turns, and never on the first turn of a wave. At most two attacks land on the same turn.
- Hero health is 100 and carries across the waves of a level. It is restored between levels.

### Calling "Impossible!"

Spotting that a number cannot be made is maths too, and it is the way out when the tiles left are no use.

- The **Impossible!** button sits at the left of the panel above the hint, away from Strike. It is a claim that the aimed number cannot be made exactly from the tiles left this turn.
- **Right:** "Sharp eye!" The leftover tiles are traded for the same number of new ones, which always include an exact two-number answer for the aimed number. The monsters do not get a turn, and the button stays: a player who runs dry again later in the turn can call again. Only the tiles left are traded, so the hand keeps shrinking and the turn still ends.
- **Wrong:** "These numbers could make it. Look again!" Nothing is lost, but the call is used up for the turn and the button becomes Pass, so it cannot be tapped as a free check.
- Tiles thrown away on a wrong answer still count as if they were in hand until the next right call, so wasting tiles never turns a makeable number into a right call.
- The game looks for answers of up to four numbers. A number that needs five or more counts as impossible, in the player's favour.
- Calls do not move the difficulty rating: the game itself says when one would be right (below), so a right call proves nothing.
- How a player finds it: the addition intro explains it; a strike thrown at a number that could not be made answers "Stuck? If the number can't be made, tap Impossible!"; and a hint asked for when no answer is left says the same.

### The dealing promise

Every hand contains, on separate tiles:

- an exact two-number answer for the weakness the turn starts aimed at, and
- an exact two-number answer for each attack landing this turn (at most two).

Spare tiles first go to a three-number answer for the same weakness, then to random numbers. This is checked by a test over thousands of seeded hands.

### Hints

- Three free hint scrolls per level. Scrolls earned at the campfire are carried on top of those; the free ones are used first.
- A hint lights up the whole path to the aimed number, one tile at a time. If what is already on the board cannot get there, the hint starts the equation over.
- If no exact answer is left this turn, the game says so, points at **Impossible!**, and the scroll is not spent.
- Nothing is revealed for free by waiting.

### Potions

- Earned at the campfire. A potion restores 30 health, never past full, and cannot be drunk at full health.
- At most two go into any one battle, so a full bag cannot buy three stars. The bag holds nine of each item.
- Items leave the bag the moment they are used, so quitting a battle neither refunds nor loses them.

### Pausing

- The gear button beside the hero opens the settings sheet, with **Leave battle**. Leaving is not a loss and saves nothing from that battle.

### Winning and losing

- A level is three waves. Clearing the last wave wins.
- Stars: 3 for finishing on 70%+ health, 2 for 35%+, otherwise 1.
- Losing is framed as "So close! Try again" and costs nothing. Two losses in a row on a level make its numbers gentler (see Adaptive difficulty).

### Balance targets (checked by simulated players in the test suite)

- A player who only ever makes exact two-number sums wins the first level at least 90% of the time, even if they never parry.
- A player who uses longer equations finishes in fewer turns.
- A player who taps two random tiles and casts loses most of the time, and still does if they also call "Impossible!" blindly.
- Every level at every tier is still won at least nine times in ten by the two-number player, helmets and plus-haters included, and a player who uses longer sums gets through a helmet level in fewer turns.
- A player who calls "Impossible!" whenever they are truly stuck finishes in about a third fewer turns than one who passes instead. That is the reward for it, in line with pillar 3.

## Enemies

- Enemy **families** map to kinds of sum and to a look: addition (green slimes), subtraction (red spiky), multiplication (purple wizards), division (blue water drops), fractions (pizza slices and a cake).
- Three ranks per family: minion, standard, boss.
- Every monster has a name by family and rank (Blobling, Blobbert, King Glob; Spikelet, Sir Prickle, Lord Thornax; Sparkling, Crystamul, Archmage Multiplix; Droplet, Dribble, The Deep Divider).
- **Every wave opens with a line from its lead monster** in a speech bubble (the highest rank does the talking; bosses have their own lines), and the hero answers with a cheer when a wave is cleared. Play is held for about half a second for each, then carries on underneath. Lines are in `src/content/taunts.ts`.
- Each family is introduced by a short **intro scene** the first time one of its levels is entered: the monster (Blobbert, Sir Prickle, Crystamul, Dribble) shows off an over-the-top personality, and the hero answers with a worked example of the new sign. The addition scene doubles as the how-to-play. Each boss gets a one-line taunt the first time its level is entered. Tap to advance; Skip is always there. Scenes are in `src/content/intros.ts`.

### Monster quirks

A quirk changes how a number has to be made or when, never which number, because there is only ever one right answer. Each is one picture a child can read. They start at a land's third level, one monster at a time.

- **Helmet.** The monster wears a knight's helmet and its weakness chip says "3 numbers". An exact two-number sum does no damage and dents the helmet ("CLANG!"); a second one knocks it off. An exact sum of three or more numbers knocks it off at once and does its usual damage. Two-number sums still win, only more slowly, so pillar 3 holds. A near miss does nothing to a helmet.
- **Hates plus.** The monster's weakness chip carries a crossed-out `+`. While it is the strike target the `+` button is crossed out, picking it is refused, and a sum that already contains `+` cannot be cast at it; none of that costs a tile. Its weakness is only ever a number two tiles can make with the land's other signs, and the deal, hints, the "Impossible!" judgement and the cast rating all leave `+` out for it. Where only one other sign is left it is applied without being picked. Blocking its attack is unrestricted. It never appears in Addition Grove, which has no other sign.
- **Boss phase.** The first time a boss is at half health or less and still standing, it takes on a quirk with a line and a shake of the stage: the helmet for the Addition, Division, Giant Peaks and Fractions bosses, hating plus for Subtraction and Multiplication. Its weakness is rolled again to suit.

### Lucky monster

- One wave in six, where the wave has two monsters or fewer, is not a boss wave and is not a land's first level, is joined by a golden monster. It is rolled from its own stream of the seed, so its turning up changes nothing else about the battle.
- It never attacks and cannot be blocked. In place of an attack chip it shows "leaves in 3"; after three turns it runs.
- It never holds a wave up: when the other monsters are beaten it runs, and the next wave arrives.
- Beating it first puts a potion in the bag (the save, so it is kept even if the battle is abandoned) with a burst of coins.

## Camp

The campfire is a camp with five things to do, each a big button, and a flame showing how many days in a row the game has been played.

- **Story time**: the reading game below. The victory panel's button goes straight to it.
- **Target practice**: sixty seconds, one number to make after another from a fresh hand of seven, no monsters. The numbers are those of the level the hero stands at, at the tier a battle there would use. An exact sum scores 1, or 2 with three or more numbers; a wrong one hands the tiles back; Skip deals another. The best score is kept. The first run each day that scores 3 or more wins a potion.
- **Word lab**: five questions a run, from 120 word parts (`src/content/wordParts.ts`), each with a meaning and three to six example words. A part is asked in one of three ways: three words that share it are shown and the child says what it means ("TRIangle, TRIcycle, TRIo"); one word is shown and the child says what the part means in it; or the meaning is given and the child picks the part. Always four choices, and a part whose meaning is close to the right one ("see" and "look") is never offered as a wrong answer.
- **The lab remembers.** A part met for the first time is always shown with three words. A run brings in about two new parts, commonest first, and spends the rest going over parts already met. A right answer makes a part wait longer before it returns (1, 2, 4, 8, then 16 runs); a wrong one brings it back soonest. This is saved, so the lab picks up where the child left off.
- The first run each day with four or more right wins a hint scroll.
- **Monster book**: a page for every monster (three ranks of five families, and the lucky one). An unbeaten monster is a shadow; a beaten one shows its picture, name, a silly line with some real maths in it, and how many have been beaten. Ten beaten gilds the page.
- **Pets and tiles**: choose the pet that follows the hero and the look of the number tiles, from what the star chests have given. Things not won yet say which chest they are in.
- **The pet at camp**: the pet in use waits in the corner by the fire on every camp screen. Tapping it gets a hop and a few words ("Blobling is happy to see you!"). It hops for a right answer in the word lab and a near answer to a story, and dances for a right story answer and a finished word lab.

**Days in a row.** Finishing a battle or a practice run or a word lab marks the day (the player's own local day) as played. The next day adds one; after a gap the count is halved, never wiped. The flame is shown on the title screen and at the camp and grows at 3 and 7 days.

## Campfire (reading)

Every level win lights the campfire for one more story (up to three waiting). It is reached from the victory panel and from the map, and is always optional.

The prize is shown wherever a story is on offer, never as a surprise: the victory panel says "A campfire story is waiting. Read it to win" with the potion and scroll pictured, the map's campfire button reads "Story time! Win" with the same pictures (and shows what is in the bag when no story is waiting), and the passage and question cards carry the same strip. The reward card names each item won, what it does, and why it was given.

1. A short passage is shown. **There is no timer on screen**: the child reads at their own pace and taps "I have read it".
2. A multiple-choice question follows (one right answer, one nearly right, three wrong). "Read it again" goes back with no penalty.
3. Rewards go into the bag for later battles:

| Answer | Reward |
|---|---|
| Right | 1 potion + 1 hint scroll |
| Nearly right | 1 potion |
| Wrong, after an honest read | 1 hint scroll |
| Wrong, tapped straight through | nothing, and a gentle "take your time" |

- An honest read is at least a quarter of a second per word with the passage on screen. The time is never shown.
- The story, its reward and the fact it was read are saved in one step when an answer is tapped, so quitting cannot re-roll an answer.
- Passages do not repeat until every one has been read. Longer passages are set slightly smaller so each fits the card without scrolling.
- **Reading level** is chosen for the child: until three stories are answered it sits half a grade below the land they have reached (Addition 2, Subtraction 2.5, Multiplication 3.5, Division 4.5); after that it follows its own rating from their answers. Settings can fix it to Easy, Medium or Hard.

There are 350 passages, fifty for each of grades 1 to 7, so a child reading five a day stays near their own level for about a month. The first fifty are in `src/content/passages.ts` and the rest in `src/content/morePassages.ts`. All of them, and the word parts, were written for the game and then checked by a second, independent model with web search (facts, whether each wrong answer is really wrong, suitability, etymology); its findings were applied and the changed passages checked again until it found nothing more. A save remembers a passage by its place in the list, so new ones are only ever added at the end.

## Adaptive difficulty

The game keeps a rating for each of the four operations and uses it to pick the size of the numbers. The method is the Elo model in [Adaptive Difficulty](ADAPTIVE_DIFFICULTY.md), fitted to hand-built levels.

- **What is rated:** every cast that could have been exact with the tiles left. Exact scores 1 (0.5 if a hint was showing), one away 0.4, further 0. Casts made when no exact answer was possible are ignored.
- **Against what:** the level's difficulty, 900 for the first step of a land rising 100 per step, shifted by 100 for the tier being played.
- **How fast:** ratings move quickly for a new player (K = 80) and settle (K falls to 24). They stay between 400 and 2000 and drift back toward 1000 by 5% for each day away, up to thirty days.
- **Tiers:** each battle is played gentle, standard or tough. Tough when the rating leads the level by 200 or more; gentle when it trails by 50 or more, or after two losses in a row on that level.
- **What a tier changes:** only the number sizes (largest tile, weakness numbers, attack numbers), which move one band down or up. Bands are the steps of the land, plus one easier than its first step and one harder than its last. Signs, monsters and waves never change, so the dealing promise and the simulated-player tests hold at every tier.
- **Override:** Settings → Sums can fix the tier to Gentle, Normal or Tough.
- Nothing on screen tells the child which tier they are on.

## Settings

Opened from the title, the map and the pause button: music on/off, sounds on/off, Sums (difficulty), Stories (reading level), and **Start over**, which needs a second tap and wipes progress but keeps these settings.

## Progression

### World map

- The first map has the four operation lands (Addition Grove, Subtraction Peaks, Multiplication Caverns, Division Depths). A second map, **Far Lands**, reached by a button at the edge, has **Giant Peaks** (big numbers) and **Fraction Fields**. Giant Peaks opens at 20 stars in total and Fraction Fields at 30; until then the land shows a lock and the stars it needs. Cave stars do not count.
- Regions are kinds of sum. On the map each is labelled with its sign and one word ("+ Addition"), and the sign is drawn huge and faint behind its levels, so a child who cannot read the word still learns which sign lives where. In battle the level is labelled the same way: sign and "Level 3".
- **A map left alone for fifteen seconds points the way:** arrows bounce over every level that can be played next, those levels glow, the rest dim, and a banner says "Tap a glowing number to play!". Any touch clears it and starts the wait again.
- **The hero stands on the map** beside the level last entered (the first level on a new save), on the side nearer the middle of its land. Coming back from a first win, the hero hops along the trail to the level it opened and stays there; the spot is saved.
- Nodes inside a region unlock in order and grow in number size and in the signs available.
- A player can start in any region, so they can begin at the right difficulty.

- Six regions of five levels each (30 levels). The fifth level of a region ends with its boss.
- **The map heals.** A land with no stars is drawn three-quarters grey and gains its colour star by star. At 15 stars its title turns gold with a crown and stars twinkle over it.
- **Star trail.** Stars newly won are held back from the land's counter until the map is next opened, then fly from the level that earned them into the counter, which counts up as the colour comes in.
- **Star chests.** Under each land's title is its chest, showing progress to the next one: 5, 10 and 15 stars in that land. When it is ready it glows; tapping it opens its lock. The three chests give, in order, a pet (a small tame one of the land's monsters), the key to the land's cave, and a tile style in the land's colours, each with a potion and a hint scroll. The pet comes first so that every child meets one early: five stars is two good levels. A new style or pet is put to use at once. The pet's chest opens on "A new friend!": the pet bounds in, dancing, and is introduced by name.
- **The lock.** Three dials, each a number, and one hand of eight tiles that holds a two-number answer for every dial on separate tiles, using the numbers of the land's first, third or fifth level. Pick a dial, build its number, tap Unlock: right opens it and uses the tiles up, wrong hands them back. There is no timer and no way to fail; "New numbers" deals again for the dials still shut.
- **Caves ("Impossible or not?").** Beside the chest is the land's cave, opened by its key. Eight riddles: five tiles, a number and the land's signs, and the question "Can these make it?" with **Yes!** and **Impossible!**. The truth is the solver's over all five tiles, so a long answer is never marked wrong; about half are possible. After each answer the game shows one way to make the number, or says there is none. Eight right is three stars, six two, four one; the stars are kept beside the level stars and the first clear gives a potion and a scroll.
- Stars earned are saved on the device and shown on the map; replaying never lowers them.
- Everything else is saved with them: ratings, items, stories waiting, passages read, intros seen and settings. An older save that only has stars still loads.

### Level definition

Each level sets: the signs available, the sign it is teaching, the largest tile, the numbers a weakness can be, the numbers an attack can be, and its three waves of monsters.

| Region | Signs | Teaches | Dealt answers |
|---|---|---|---|
| Addition Grove | `+` | `+` | sums up to 30 |
| Subtraction Peaks | `+ −` | `−` | differences, tiles up to 30 |
| Multiplication Caverns | `+ ×` | `×` | times tables up to 12 × 12 |
| Division Depths | `+ × ÷` | `÷` | quotients up to 12 |
| Giant Peaks | `+ − × ÷` | any | tiles up to 50, weaknesses up to 100 |
| Fraction Fields | `+ −` | `+` | halves, then quarters, tiles up to 7 |

**Giant Peaks** is home to all four of the first lands' monsters, a different pair on each level. A weakness is never more than twice the biggest tile, so two added tiles can always make it.

**Fraction Fields** counts in halves on its first two levels and in quarters after that. Each level has a *grain* (1, a half or a quarter): the smallest step a number may be. Running totals must land on the grain, hands are dealt in units of it, and "one away" for a near miss means one step of it. Attacks are always whole numbers and a softened blow is rounded up, so health never has a fraction in it. Halves and quarters are drawn as two small digits either side of a bar, from the same glyphs as every other number. Its monsters are a pizza slice (Crumb, Slicer) and a cake boss (Baron von Gateau).

The dealt two-number answer always uses the sign being taught when it can. Monsters from an earlier region wander into later ones so old skills keep being used. Attacks only grow when ignored in the first two regions, where two added tiles can always answer the bigger number.

### Session design

- A level is roughly ten turns, about five minutes.
- Levels chain naturally up to about twenty minutes.

### Unlocks

- Tile styles and pets from star chests, cave keys, potions and hint scrolls. All maths content is reachable without them; the two far lands open on stars.

## Feel

Feel is a requirement, not polish.

- **Title screen:** key art, animated logo, music. It should make a child want to press Play.
- **Numbers** in play (tiles, chips, damage) use a custom drawn glyph set, not a stock font.
- **Sound:** every tap, hit, parry, miss and win has its own sound; music for title, battle and campfire. Sound stops when the app is in the background. All audio is CC0, credited in `public/assets/audio/CREDITS.md`.
- **Motion:** attacks have a wind-up before numbers change; hits shake and flash; results pop.
- **Characters are animated frame by frame.** The hero has four-frame idle, attack, hurt and cheer animations; every monster and boss has a four-frame idle. Sheets are in `art-src/anim_*.png` and are cut into strips by `art-src/slice-anim.sh`.
- **A hit that does not finish a monster still shows:** from its first lost health until it is beaten it switches to an injured animation (dizzy, plastered, sweating), so "I hurt it" is visible without reading the health bar.
- **Beating a monster is an event:** it pops and spins out, stars and coins burst from it, a comic-book word lands (KO!, POW!, BAM!, ZAP!), the stage shakes and the hero cheers.
- **Screens change behind a curtain:** striped panels sweep shut with a spinning star and open on the next screen, about half a second in all.

## Technology

- **Why web:** the game is a turn-based tile and text interface. DOM/CSS gives crisp text at phone pixel densities, layout that adapts to any aspect ratio, and a build that can be driven and inspected automatically in a browser on every change.
- **iOS:** the Xcode project is in `ios/` (iPhone and iPad, landscape only, full screen, iOS 15 and up) and compiles; it has not yet been run on a simulator or a device. Music volume goes through a gain node (iOS ignores an audio element's volume), sound unlocks on the first touch anywhere, audio is MP3, and layout has a fallback for browsers without dynamic viewport units.
- **Save on phones:** the save is written to the web view's `localStorage` and, in the Android and iOS apps, also to the device's own preferences (`@capacitor/preferences`), because iOS may clear a web view's storage. If the first copy is missing at launch the game takes progress from the second. All save access is in `src/ui/save.ts`.
- **Structure:**
  - `src/engine/` is pure and deterministic (seeded): equation rules, solver, dealing, and a battle reducer that returns a list of steps (state + what happened).
  - `src/content/` holds the words: intro scenes, taunts, reading passages, word parts, monster facts and the names of pets and tile styles.
  - `src/engine/board.ts` is the sum being built from a hand of tiles; the battle, the chest lock and target practice all use it, and `src/ui/sums/` draws it for all three.
  - `src/ui/` renders the current step and plays an animation for each event before showing the next.
- **Sizing:** one rem is the smaller of 1/22.5 of the screen height or 1/40 of its width, so the whole layout scales together. Touch targets are at least 48 CSS px on an S21.
- **Checks:**
  - `pnpm test`: rules, the dealing promise and simulated players at every tier, saved progress, ratings, campfire rewards.
  - `pnpm e2e`: plays whole levels through the real interface on an emulated S21 with the CPU slowed 4×, and fails on console errors, overflow, small touch targets, slow frames, long stalls, a strike with no damage number, a defeat with no burst, a monster that survived a hit without looking hurt, an idle map that never points at a level, a wave with no opening line, or an Impossible call that gets no answer. It also walks one journey: win, read at the campfire, carry the reward into the next battle, drink it, pause, leave, change settings, start over.

## Related documents

- [Wave Structure](WAVE_STRUCTURE.md) — session pacing research (written for the first version; turn timing still applies)
- [Adaptive Difficulty](ADAPTIVE_DIFFICULTY.md) — the research behind the ratings; "Adaptive difficulty" above is what is built
- [Reading Corpus Pipeline](READING_CORPUS_PIPELINE.md)
- [Art Direction](ART_DIRECTION_RESEARCH.md)
- [Recovery Balance](RECOVERY_BALANCE.md) — written for in-battle healing; the effort-based reward idea carries over to campfire items
- [Kids Game UX](KIDS_GAME_UX_RESEARCH.md), [Mobile UX](MOBILE_TABLET_UX_RESEARCH.md)

## Open questions

1. **Tuning with real children.** The simulated players are perfect or random; real play will sit between. Level length and attack sizes are the first levers. The rating thresholds (200 ahead, 50 behind) and the quarter-second-per-word reading floor are first guesses.
2. **Reading corpus curation.** Pipeline designed, content needs review.
3. **Accessibility.** Colour-blind safety for the red/blue chips (icons already differ), reduced motion, screen readers.
4. **Analytics and privacy.** Ratings and reading times stay on the device today. Anything sent off it needs a COPPA / GDPR-K decision first.
