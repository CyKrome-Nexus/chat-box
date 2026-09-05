const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

// Telegram-format animated stickers (gzip-compressed Lottie JSON) — see
// docs/architecture/stickers.md. Metro doesn't treat arbitrary extensions as
// bundleable assets by default.
config.resolver.assetExts.push("tgs");

module.exports = config;
