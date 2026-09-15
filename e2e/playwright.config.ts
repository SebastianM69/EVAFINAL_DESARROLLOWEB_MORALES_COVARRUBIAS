import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
    launchOptions: { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' },
  },
  webServer: [
    {
      command:
        'corepack pnpm --dir ../apps/api exec prisma migrate deploy && corepack pnpm --dir ../apps/api db:seed && corepack pnpm --dir ../apps/api start',
      url: 'http://127.0.0.1:3000/health',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      url: 'http://127.0.0.1:5173',
      env: { VITE_API_URL: 'http://127.0.0.1:3000/api/v1' },
      command: 'corepack pnpm --dir ../apps/web dev -- --host 127.0.0.1',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
