# Single Source of Truth (SSOT) App Versioning Engine

## Overview

Implements issue #46. `package.json`'s `"version"` field is now the *only* place a human edits a
version number. Everything else — Expo config, the native Android/iOS build identifiers, and every
in-app UI surface that shows a version — derives from it automatically.

## `app.config.ts` replaces the static `app.json`

The previous static `app.json` (every field ported over unchanged) is deleted; a plain JSON file
can't import or compute anything, so a dynamic config was required specifically to read
`package.json`'s version and derive the native build identifiers from it:

```ts
version: packageJson.version,
ios: { buildNumber: calculateBuildNumber(packageJson.version), ... },
android: { versionCode: calculateVersionCode(packageJson.version), ... },
```

Verified for real, not just by reading the code: `npx expo config --type introspect` shows
`ios.buildNumber: "10000"` and `android.versionCode: 10000` computed from `package.json`'s
`"1.0.0"`, and running `npx expo prebuild` (regenerating this repo's gitignored `android/`/`ios/`
native projects — see below) produced `android/app/build.gradle`'s `versionCode 10000` and
`ios/*/Info.plist`'s `CFBundleVersion` `10000`, both genuinely propagated from the one source.

### The version-code formula

`scripts/versioning.js` (plain CommonJS — see "Why two files" below):

- `calculateVersionCode("1.2.3")` → `10203` (`major * 10000 + minor * 100 + patch`) — the ticket's
  own example, and a scheme that keeps Android's `versionCode` monotonically increasing (a Play
  Store upload requirement) as long as minor/patch stay under 100.
- `calculateBuildNumber(version)` → the same integer, stringified, since iOS's `CFBundleVersion`
  just needs to be a string that increases between uploads of the same marketing version — reusing
  the exact same number keeps both platforms' build identifiers trivially comparable for one
  release instead of inventing two different encodings.

### Why two files (`scripts/versioning.js` + `src/lib/versioning/buildNumber.ts`)

Expo's config loader transpiles only the single `app.config.ts` entrypoint file in-memory (via
`@expo/config`'s `evalConfig`) — it does not bundle whatever that file imports the way Metro would
for runtime app code. A sibling `.ts` module (using `export`/`import`) fails to resolve there with
a plain `Cannot find module` error, confirmed while building this: `app.config.ts` must
`require()` a plain CommonJS `.js` file. `scripts/versioning.js` is that file — the actual, single
implementation. `src/lib/versioning/buildNumber.ts` is a two-line typed re-export of the same
`require()`'d module, existing only so runtime app code (`useAppVersionInfo.ts`) gets proper
TypeScript types; there is exactly one implementation, not a duplicated one.

## Runtime UI: `useAppVersionInfo()`

`src/hooks/useAppVersionInfo.ts` is the one place any screen reads the app's version — no component
should ever hardcode a version string (there were none to begin with in this codebase, so this
ticket's contribution here is adding the *only* version display that exists, in a way that can
never drift). It prefers `expo-application`'s `Application.nativeApplicationVersion`/
`nativeBuildVersion` (reading the actual installed binary's `Info.plist`/`build.gradle` — the most
accurate source once a real native build exists) and falls back to
`Constants.expoConfig?.version`/`ios.buildNumber`/`android.versionCode` (reflecting `app.config.ts`
as evaluated for the currently-running JS bundle — always available, including in dev clients where
the native shell hasn't been rebuilt for the current JS). Wired into **Settings → Help → About**
(`settings-help.tsx`), the natural home for a version display in this app's existing settings
structure — there is no separate footer or debug panel screen in this codebase to also wire it into.

## Automated version bumping

`package.json` gained three scripts, all thin wrappers over npm's own built-in version command
(chosen over a custom script since it already does exactly what the ticket asks — bump `package.json`
+ `package-lock.json`, commit, and tag — correctly and atomically, with no custom logic to get wrong):

```json
"version:patch": "npm version patch -m \"chore(release): v%s\"",
"version:minor": "npm version minor -m \"chore(release): v%s\"",
"version:major": "npm version major -m \"chore(release): v%s\""
```

Running e.g. `npm run version:patch` bumps `1.0.0` → `1.0.1` in `package.json`, commits that change
with the message `chore(release): v1.0.1`, and creates a git tag `v1.0.1` — after which every
`app.config.ts` evaluation (a dev server restart, `expo prebuild`, an EAS build) picks up the new
version and recomputed build identifiers automatically, with zero other file edited by hand.

The three `build:android:*` scripts now run `expo prebuild --platform android --no-install` before
invoking Gradle, so a release build pipeline regenerates `android/` from the current
`app.config.ts` (and therefore the current `package.json` version) every time, rather than
building whatever versionCode happened to be baked into a stale, previously-generated
`build.gradle`. This is the concrete mechanism behind the ticket's "pre-build/release pipelines
automatically inherit the canonical version."

## What's out of scope

- `android/` and `ios/` are gitignored, locally-generated `expo prebuild` output in this repo (this
  is a managed Expo workflow with no committed native project — see
  [audio-calling-engine.md](../../../../docs/architecture.md) for the same point made about config
  plugins generally). They were regenerated once during this work purely to verify the propagation
  end-to-end (see above); there's nothing to commit or hand-edit in them, since prebuild always
  regenerates them fresh from `app.config.ts`.
- No `eas.json` or CI workflow exists in this repository to also update — there is currently no
  CI/CD pipeline configured here at all.
