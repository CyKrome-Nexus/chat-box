// eslint-disable-next-line @typescript-eslint/no-var-requires
const impl = require("../../../scripts/versioning.js") as {
	calculateVersionCode: (version: string) => number;
	calculateBuildNumber: (version: string) => string;
};

/**
 * Typed re-export of `scripts/versioning.js` for runtime app code (the
 * Settings -> About screen). See that file for why the actual
 * implementation lives in a plain CommonJS module instead of here directly
 * — `app.config.ts` needs to `require()` it too, and can't `require()` a
 * `.ts` file.
 */
export const calculateVersionCode = impl.calculateVersionCode;
export const calculateBuildNumber = impl.calculateBuildNumber;
