import { defineConfig, devices } from '@playwright/test'

/**
 * End to end tests run against a production build with NO Supabase configured.
 * That is deliberate. The app must be fully usable local-first, and the
 * persistence guarantee has to hold on IndexedDB alone.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3737',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 13'] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run start -- -p 3737',
        url: 'http://localhost:3737/games',
        reuseExistingServer: true,
        timeout: 120_000,
      },
})
