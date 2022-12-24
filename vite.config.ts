/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import viteTsconfigPaths from "vite-tsconfig-paths";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig({
  test: {},
  build: {
    sourcemap: true,
    lib: {
      entry: "./src/lib/index.ts",
      formats: ["es"],
      fileName: "route-f",
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
      output: {
        globals: {
          react: "React",
        },
      },
    },
  },
  plugins: [
    react(),
    viteTsconfigPaths(),
    dts({ insertTypesEntry: true }),
    visualizer({ emitFile: true, filename: "stats.html" }),
  ],
});
