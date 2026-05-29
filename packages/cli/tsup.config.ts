import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["esm"],
  clean: true,
  banner: { js: "#!/usr/bin/env node" },
  // Workspace and heavy deps are resolved at runtime from node_modules.
  external: ["@parsify/core", "@parsify/node", "@parsify/ocr"],
});
