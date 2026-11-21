# Axiom Strike

A turn-based maths fighting game for phones and tablets, for ages 6-12. Build sums from number tiles to strike monsters and to parry their attacks.

**Platforms:** Android, iOS (landscape). **Device floor:** Samsung Galaxy S21.

## Getting started

```sh
pnpm install
pnpm dev        # then open the printed URL in a phone-sized landscape window
```

Useful URL parameters while developing: `?level=add_1` (any level id, e.g. `mul_3`) to jump straight into a battle (skipping the intro scene), `?seed=7` for a repeatable game.

## Checks

```sh
pnpm test         # rules, dealing promise, simulated players, save, ratings, campfire
pnpm typecheck
pnpm build && pnpm preview --port 5198
BASE_URL=http://localhost:5198/ pnpm e2e   # full playthroughs and a campfire/items/settings journey on an emulated S21, 4x CPU throttle
```

## Android debug build

Needs a JDK and the Android SDK (platform 36, build-tools 36). With Homebrew:

```sh
brew install openjdk@21 && brew install --cask android-commandlinetools
export JAVA_HOME=/opt/homebrew/opt/openjdk@21 ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"
pnpm android    # writes android/app/build/outputs/apk/debug/app-debug.apk
```

Install on a connected phone with `$ANDROID_HOME/platform-tools/adb install -r android/app/build/outputs/apk/debug/app-debug.apk`.

## Where things are

```
src/engine/     pure game rules (seeded, no DOM)
src/content/    intro scenes and reading passages
src/ui/         screens, animation, sound
tests/          vitest, including simulated players that guard balance
e2e/            Playwright playthrough
android/        Capacitor Android project (landscape, full screen)
public/assets/  images and audio
art-src/        original generated art before slicing
docs/           design documentation; start with GAME_DESIGN.md
```

The original Defold/Lua version is kept as the git tag `defold-final`.
