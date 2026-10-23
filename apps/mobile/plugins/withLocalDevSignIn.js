const { withEntitlementsPlist } = require("expo/config-plugins");

/**
 * expo-apple-authentication auto-applies its own config plugin (unconditionally,
 * regardless of `ios.usesAppleSignIn` or whether it's listed in this project's
 * `plugins` array — see @expo/prebuild-config's `versionedExpoSDKPackages`)
 * which adds the `com.apple.developer.applesignin` entitlement. That entitlement
 * makes Xcode require a real development-team code signing certificate even for
 * simulator builds. EAS build workers have that certificate; a local machine
 * running `expo run:ios` usually doesn't. Strip the entitlement back out for
 * local builds so `expo run:ios` keeps working without any signing setup.
 */
const withLocalDevSignIn = (config) => {
    return withEntitlementsPlist(config, (mod) => {
        delete mod.modResults["com.apple.developer.applesignin"];
        return mod;
    });
};

module.exports = withLocalDevSignIn;
