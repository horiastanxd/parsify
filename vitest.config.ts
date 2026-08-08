import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// fileURLToPath keeps this working on Node 18 (import.meta.dirname is 20.11+).
const here = dirname(fileURLToPath(import.meta.url));

// Alias workspace packages to their TypeScript sources so the unit suite runs
// without a build step. Heavy converters are tested separately (they need
// their parser dependencies and binary fixtures).
export default defineConfig({
  resolve: {
    alias: {
      "@parsify/core": resolve(here, "packages/core/src/index.ts"),
      "@parsify/browser": resolve(here, "packages/browser/src/index.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
