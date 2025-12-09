import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  optimizeDeps: {
    /**
     * For some reason, vitest in dagger ends up reoptimizing this dep and
     * complains about potential test flakiness as a result. Adding it to the
     * list of explicit deps to optimize seems to fix this.
     */
    include: ["react/jsx-dev-runtime"],
  },
  test: {
    browser: {
      provider: playwright(),
      enabled: true,
      instances: [{ browser: "chromium" }, { browser: "webkit" }],
    },
  },
});
