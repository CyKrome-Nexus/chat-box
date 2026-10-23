const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("expo/config-plugins");

const MIN_TARGET = "15.1";
const MARKER = "# chatbox: pods deployment target";

// Newer Xcode rejects pods that still declare iOS < 15; raise them in the generated Podfile.
const withPodsDeploymentTarget = (config) =>
    withDangerousMod(config, [
        "ios",
        (mod) => {
            const podfile = path.join(mod.modRequest.platformProjectRoot, "Podfile");
            const contents = fs.readFileSync(podfile, "utf8");
            if (contents.includes(MARKER)) return mod;

            const patched = contents.replace(
                /post_install do \|installer\|\n/,
                `post_install do |installer|
    ${MARKER}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        current = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current.nil? || Gem::Version.new(current) < Gem::Version.new('${MIN_TARGET}')
          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MIN_TARGET}'
        end
      end
    end
`
            );
            fs.writeFileSync(podfile, patched);
            return mod;
        },
    ]);

module.exports = withPodsDeploymentTarget;
