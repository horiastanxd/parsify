import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

const here = import.meta.dirname;

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
