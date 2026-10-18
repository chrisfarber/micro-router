import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  test: {
    browser: {
      provider: playwright(),
      enabled: true,
      instances: [
        { browser: "chromium" },
        { browser: "webkit" },
        ...(process.env.CI ? [{ browser: "firefox" as const }] : []),
      ],
    },
  },
});
