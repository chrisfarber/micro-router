/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import dts from "vite-plugin-dts";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig({
  test: {},
  build: {
    sourcemap: true,
    minify: false,
    lib: {
      entry: "./src/lib/index.ts",
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: [/^react($|\/)/, /^react-dom($|\/)/, /^@micro-router($|\/)/],
      output: {
        globals: {
          react: "React",
        },
      },
    },
  },
  plugins: [
    react(),
    dts({ insertTypesEntry: true, tsconfigPath: "tsconfig.lib.json" }),
    visualizer({ emitFile: true, filename: "stats.html" }),
  ],
});
