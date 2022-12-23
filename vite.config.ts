/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";

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
      external: ["react", "react-dom"],
    },
  },
  plugins: [react(), dts({ insertTypesEntry: true })],
});
