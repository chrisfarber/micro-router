/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: "./src/index.ts",
      formats: ["es"],
      fileName: "index",
    },
    minify: false,
  },
  plugins: [dts({ tsconfigPath: "./tsconfig.lib.json", rollupTypes: true })],
});
