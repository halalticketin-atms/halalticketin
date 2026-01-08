import { defineConfig, devices } from '@playwright/test';

const frontendPort = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
const backendPort = 3001;

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  workers: 2,
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Desktop Chrome - Primary browser
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    // Mobile Safari - Critical for iOS users
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 14'],
        browserName: 'webkit'
      },
    },
    // Tablet
    {
      name: 'Tablet',
      use: {
        ...devices['iPad (gen 7)'],
      },
    },
  ],
  // Start BOTH frontend and backend servers
  webServer: [
    {
      command: `cd ../backend && npm run dev`,
      port: backendPort,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: `npm run dev -- --hostname 127.0.0.1 --port ${frontendPort}`,
      port: frontendPort,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
