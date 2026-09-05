const { withEntitlementsPlist } = require("expo/config-plugins");

const APP_GROUP_ID = "group.com.cykrome.chatbox";

/**
 * Adds the shared App Group entitlement (`group.com.cykrome.chatbox`) the
 * ticket's iOS Notification Service Extension needs to share Keychain-backed
 * ratchet state with the main app. This is the one piece of the NSE setup
 * that's safely automatable via Expo's documented config-plugin "mod" APIs
 * (`withEntitlementsPlist`) without hand-editing a `.pbxproj` file.
 *
 * What this plugin does NOT do — and why: creating the actual NSE *target*
 * (a second app extension bundled alongside the main app, with its own
 * Info.plist, entitlements, and Swift source) means adding a new target to
 * the Xcode project file, which `expo prebuild` doesn't do automatically for
 * arbitrary custom extensions the way it does for the plugins it ships
 * (there's no first-party "Notification Service Extension" plugin in the
 * `expo` package as of this SDK). Doing that safely needs either a
 * specialized third-party config plugin built exactly for NSE target
 * injection, or a one-time manual step in Xcode adding the target and
 * pointing it at native-reference/ios/NotificationService.swift — neither of
 * which this environment can perform or verify (no macOS/Xcode available
 * here to run `expo prebuild`/`pod install`/an actual build against). See
 * docs/architecture/encrypted-push.md.
 */
const withEncryptedPush = (config) => {
    config = withEntitlementsPlist(config, (mod) => {
        mod.modResults["com.apple.security.application-groups"] = [APP_GROUP_ID];
        return mod;
    });

    return config;
};

module.exports = withEncryptedPush;
