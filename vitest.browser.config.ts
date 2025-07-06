import { defineConfig } from 'vitest/config'
import solid from 'vite-plugin-solid'

export default defineConfig({
    plugins: [solid()],
    test: {
        dir: 'test',
        browser: {
            enabled: true,
            provider: 'playwright',
            // https://vitest.dev/guide/browser/playwright
            instances: [
                {
                    browser: 'chromium',
                    headless: true,
                },
                {
                    browser: 'firefox',
                    headless: true,
                },
                {
                    browser: 'webkit',
                    headless: true,
                },
            ],
        },
        exclude: [ '**/server*' ],
    },
})
