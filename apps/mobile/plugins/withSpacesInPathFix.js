const { withXcodeProject } = require("expo/config-plugins");

/**
 * This project's path contains spaces ("Personal Work", "CyKrome Group", ...).
 * React Native's generated "Bundle React Native code and images" build phase
 * resolves react-native-xcode.sh via an UNQUOTED backtick command
 * substitution, e.g.:
 *
 *   `"$NODE_BINARY" --print "require('path').dirname(...) + '/scripts/react-native-xcode.sh'"`
 *
 * The backticks aren't wrapped in quotes, so once the resolved path contains
 * spaces, the shell word-splits it and tries to run "/Users/you/Some" as a
 * command ("No such file or directory"). Quoting the substitution fixes it.
 * This has to be patched post-generation (rather than upstream) because the
 * build phase's shellScript text is baked into `ios/*.xcodeproj/project.pbxproj`
 * verbatim by Expo's prebuild template every time `expo prebuild` runs.
 *
 * Note: the `xcode` library keeps `shellScript` in its raw pbxproj-escaped
 * form (e.g. a literal quote is stored as the two characters `\"`), so the
 * quote character used here has to match that escaping, not a plain `"`.
 */
const ESCAPED_QUOTE = "\\\""; // the two characters: backslash, quote
const BACKTICK_COMMAND = /`[^`]*react-native-xcode\.sh[^`]*`/;

const withSpacesInPathFix = (config) => {
    return withXcodeProject(config, (mod) => {
        const shellScriptBuildPhases = mod.modResults.hash.project.objects.PBXShellScriptBuildPhase ?? {};
        for (const phase of Object.values(shellScriptBuildPhases)) {
            const script = phase?.shellScript;
            if (!script || !BACKTICK_COMMAND.test(script)) continue;

            const match = script.match(BACKTICK_COMMAND)[0];
            const alreadyQuoted = script.includes(ESCAPED_QUOTE + match);
            if (alreadyQuoted) continue;

            phase.shellScript = script.replace(match, ESCAPED_QUOTE + match + ESCAPED_QUOTE);
        }
        return mod;
    });
};

module.exports = withSpacesInPathFix;
