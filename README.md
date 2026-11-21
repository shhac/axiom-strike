# Axiom Strike

A turn-based maths fighting game for phones and tablets, for ages 6-12. Build sums from number tiles to strike monsters and to parry their attacks.

**Platforms:** Android, iOS (landscape). **Device floor:** Samsung Galaxy S21.

## Getting started

```sh
pnpm install
pnpm dev        # then open the printed URL in a phone-sized landscape window
```

Useful URL parameters while developing: `?level=add_1` or `?level=sub_1` to jump straight into a battle, `?seed=7` for a repeatable game.

## Checks

```sh
pnpm test         # rules, dealing promise, simulated players
pnpm typecheck
pnpm build && pnpm preview --port 5198
BASE_URL=http://localhost:5198/ pnpm e2e   # full playthroughs on an emulated S21, 4x CPU throttle
```

## Where things are

```
src/engine/     pure game rules (seeded, no DOM)
src/ui/         screens, animation, sound
tests/          vitest, including simulated players that guard balance
e2e/            Playwright playthrough
public/assets/  images and audio
art-src/        original generated art before slicing
docs/           design documentation; start with GAME_DESIGN.md
```

The original Defold/Lua version is kept as the git tag `defold-final`.
