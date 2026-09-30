import { defineConfig, devices } from '@playwright/test';

/**
 * Tests de bout en bout sur le build de production (dist/), servi par `vite preview`.
 * Ils vérifient les critères d'acceptation de J1 : démo dessinée, 3D tactile, métrés, .zip, mode avion.
 * `npm run build` doit avoir été lancé avant (le serveur ne rebuild pas).
 */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173/',
    locale: 'fr-FR',
    acceptDownloads: true,
    trace: 'retain-on-failure',
    launchOptions: {
      // Rendu logiciel pour le WebGL en CI et en bac à sable.
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
      ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    },
  },
  projects: [
    { name: 'bureau', use: { ...devices['Desktop Chrome'], hasTouch: true, viewport: { width: 1280, height: 800 } }, testIgnore: /telephone\.spec\.ts/ },
    { name: 'telephone', use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium' }, testMatch: /telephone\.spec\.ts/ },
  ],
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
