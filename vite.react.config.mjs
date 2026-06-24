import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const repoRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: resolve(repoRoot, "src/react"),
  publicDir: false,
  plugins: [react()],
  server: {
    fs: {
      allow: [repoRoot],
    },
  },
  build: {
    outDir: resolve(repoRoot, "dist-react"),
    emptyOutDir: true,
  },
});
