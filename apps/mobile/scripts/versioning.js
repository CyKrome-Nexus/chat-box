/**
 * Deterministic native build identifiers derived from the app's semver
 * version — see docs/architecture/versioning.md.
 *
 * Plain CommonJS (not TypeScript) specifically so `app.config.ts` can
 * `require()` it directly: Expo's config loader only transpiles the single
 * `app.config.ts` entrypoint file itself in-memory, not whatever it
 * imports, so a sibling `.ts` module fails to resolve there (Node can't
 * `require()` TypeScript). `src/lib/versioning/buildNumber.ts` re-exports
 * these same functions with types for use by runtime app code (the Settings
 * -> About screen), so there is exactly one implementation either way.
 */

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)/;

function parseSemver(version) {
	const match = SEMVER_RE.exec(version);
	if (!match) {
		throw new Error(`"${version}" is not a valid semver version (expected "X.Y.Z").`);
	}
	return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

/**
 * Android `versionCode` must be a monotonically increasing integer — Google
 * Play rejects an upload whose versionCode doesn't exceed the previous
 * release's. Encoding each semver component into a fixed-width decimal slot
 * (major * 10_000 + minor * 100 + patch) guarantees that property as long as
 * no component exceeds two digits (minor/patch 0-99). Matches the ticket's
 * own example exactly: "1.2.3" -> 10203.
 */
function calculateVersionCode(version) {
	const { major, minor, patch } = parseSemver(version);
	return major * 10000 + minor * 100 + patch;
}

/**
 * iOS `CFBundleVersion` (buildNumber) just needs to increase between
 * TestFlight/App Store uploads of the same marketing version — reusing the
 * same versionCode integer (stringified, as Info.plist requires a string
 * here) keeps both platforms' build identifiers trivially comparable for
 * the same release instead of inventing a second, different encoding.
 */
function calculateBuildNumber(version) {
	return String(calculateVersionCode(version));
}

module.exports = { calculateVersionCode, calculateBuildNumber };
