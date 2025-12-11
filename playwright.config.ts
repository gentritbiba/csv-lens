import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Setup project - runs first to authenticate
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    // Unauthenticated tests (landing, login pages) - no dependencies
    {
      name: 'public-pages',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /landing\.spec\.ts|auth\/login\.spec\.ts/,
    },
    // Authenticated tests (app pages) - depends on setup
    {
      name: 'app-pages',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
      testMatch: /app\/.*\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
