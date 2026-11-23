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
pnpm android    # writes android/app/build/outputs/apk/debug/axiom-strike-v0.6.0-debug.apk
```

Install on a connected phone with `$ANDROID_HOME/platform-tools/adb install -r android/app/build/outputs/apk/debug/axiom-strike-v0.6.0-debug.apk`.

### Release build

APK file names carry the version from `versionName`. `pnpm android:release` writes a signed APK (`android/app/build/outputs/apk/release/axiom-strike-v0.6.0.apk`) and a Play Store bundle (`android/app/build/outputs/bundle/release/app-release.aab`).

Signing is read from `android/keystore.properties`, which is not committed:

```
storeFile=/absolute/path/to/upload.jks
storePassword=...
keyAlias=upload
keyPassword=...
```

Without that file the release build still compiles but is unsigned. Keep a backup of the keystore and its password: updates to a published app must be signed with the same key. Raise `versionCode` in `android/app/build.gradle` for every upload.

## iOS build

Needs Xcode. `pnpm ios` builds the web app, copies it into `ios/` and compiles the app for the simulator without signing, which checks that the project builds.

To run it, `pnpm ios:open` opens the project in Xcode. Pick a simulator (Xcode > Settings > Components installs one) or a connected iPhone or iPad and press Run. A real device, TestFlight and the App Store need an Apple Developer team chosen under the App target's Signing & Capabilities; the bundle id is `com.axiomstrike.game`.

Raise `CURRENT_PROJECT_VERSION` in the Xcode project for every upload and keep `MARKETING_VERSION` in step with `package.json`.

## Where things are

```
src/engine/     pure game rules (seeded, no DOM)
src/content/    intro scenes, wave taunts and reading passages
src/ui/         screens, animation, sound
tests/          vitest, including simulated players that guard balance
e2e/            Playwright playthrough
android/        Capacitor Android project (landscape, full screen)
ios/            Capacitor iOS project (iPhone and iPad, landscape, full screen)
public/assets/  images and audio
art-src/        original generated art before slicing
docs/           design documentation; start with GAME_DESIGN.md
```

The original Defold/Lua version is kept as the git tag `defold-final`.
