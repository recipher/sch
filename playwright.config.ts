import { defineConfig } from 'playwright/test'

// Used by `remix test` for e2e and browser tests. Add firefox/webkit projects here after
// installing them with `npx playwright install`.
export default defineConfig({
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  use: {
    navigationTimeout: 5_000,
    actionTimeout: 5_000,
  },
})
