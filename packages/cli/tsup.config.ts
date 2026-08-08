import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "tsup";

// Resolve paths relative to this config file so the build works whether tsup is
// invoked from the package directory or from the repo root (via --config).
const dir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  entry: [resolve(dir, "src/cli.ts")],
  outDir: resolve(dir, "dist"),
  format: ["esm"],
  clean: true,
  banner: { js: "#!/usr/bin/env node" },
  // Workspace and heavy deps are resolved at runtime from node_modules.
  external: ["@parsify/core", "@parsify/node", "@parsify/ocr"],
});
