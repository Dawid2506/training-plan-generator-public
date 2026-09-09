import { defineConfig, devices } from "@playwright/test";

import { ADMIN_STORAGE_STATE, ENV, hasAdminCredentials } from "./env";

/**
 * The suite assumes the app is already running: the frontend on BASE_URL and the
 * API on API_URL. It deliberately does not own a `webServer` - starting a stack
 * it did not build makes failures ambiguous ("is the app broken, or did the
 * suite fail to boot it?").
 */
export default defineConfig({
  testDir: "./specs",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  globalTeardown: "./global-teardown.ts",

  use: {
    baseURL: ENV.baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    testIdAttribute: "data-testid",
  },

  projects: [
    // Signs the shared admin account in once and caches the session, so the
    // @admin specs do not each pay for a login.
    ...(hasAdminCredentials
      ? [
          {
            name: "setup",
            testDir: "./fixtures",
            testMatch: /admin\.setup\.ts/,
            use: { ...devices["Desktop Chrome"] },
          },
        ]
      : []),
    {
      name: "e2e",
      use: { ...devices["Desktop Chrome"] },
      dependencies: hasAdminCredentials ? ["setup"] : [],
      metadata: { adminStorageState: ADMIN_STORAGE_STATE },
    },
  ],
});
