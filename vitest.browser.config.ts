import { defineConfig } from 'vitest/config'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solid()],
  test: {
    browser: {
      enabled: true,
      provider: 'playwright',
      // https://vitest.dev/guide/browser/playwright
      instances: [
      { browser: 'chromium' },
      { browser: 'firefox' },
      { browser: 'webkit' },
      ],
    },
  },
})
