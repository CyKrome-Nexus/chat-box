import Constants from "expo-constants";
import * as Application from "expo-application";

export interface IAppVersionInfo {
	/** The semver marketing version — "1.2.3". */
	version: string;
	/** The platform-native build identifier — Android versionCode or iOS
	 * CFBundleVersion, as a string either way. */
	buildNumber: string;
}

/**
 * The one place any UI reads the app's version — see
 * docs/architecture/versioning.md. Never hardcode a version string in a
 * component; call this hook instead.
 *
 * `expo-application`'s `Application.nativeApplicationVersion`/
 * `nativeBuildVersion` read the *actual installed binary's* Info.plist/
 * build.gradle values — the most accurate source once a real native build
 * exists, but they're `null` in some dev-client/Expo-Go configurations
 * where the native shell wasn't rebuilt for the current JS bundle.
 * `expo-constants`' `Constants.expoConfig` reflects `app.config.ts` as
 * evaluated for the *currently running* JS bundle, which is always
 * available. Preferring the native values when present and falling back to
 * the config ones covers both cases correctly rather than picking one API
 * and leaving the other dead code.
 */
export const useAppVersionInfo = (): IAppVersionInfo => {
	const version = Application.nativeApplicationVersion || Constants.expoConfig?.version || "0.0.0";
	const buildNumber =
		Application.nativeBuildVersion ||
		String(Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || "0");

	return { version, buildNumber };
};
