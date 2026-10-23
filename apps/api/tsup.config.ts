import { defineConfig } from "tsup";

// Native addons and optional driver integrations stay external; everything else is bundled
// so the runtime image only needs `dist/` plus the packages listed here.
export const runtimeExternals = ["@node-rs/argon2"];

const optionalExternals = [
  "bufferutil",
  "utf-8-validate",
  "kerberos",
  "snappy",
  "socks",
  "aws4",
  "@mongodb-js/zstd",
  "mongodb-client-encryption",
  "gcp-metadata",
  "@aws-sdk/credential-providers",
  "pino-pretty",
];

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  platform: "node",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  splitting: false,
  minify: true,
  external: [...runtimeExternals, ...optionalExternals],
  noExternal: [
    new RegExp(
      `^(?!(${[...runtimeExternals, ...optionalExternals].map((name) => name.replace(/[/.]/g, "\\$&")).join("|")})(/|$))`,
    ),
  ],
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
  },
});
