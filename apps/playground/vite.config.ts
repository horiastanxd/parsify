import { defineConfig } from "vite";

// Base path is set for GitHub Pages project sites; override with --base if needed.
export default defineConfig({
  base: process.env.PARSIFY_BASE ?? "/",
  define: {
    global: "globalThis",
  },
  resolve: {
    alias: {
      buffer: "buffer",
    },
  },
  optimizeDeps: {
    include: ["buffer"],
  },
});
