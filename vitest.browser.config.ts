/// <reference types="@vitest/browser/providers/playwright" />
import { defineConfig } from 'vitest/config'
import solid from 'vite-plugin-solid'
import { type BrowserCommand } from 'vitest/node'
import { type BrowserCommands } from '@vitest/browser/context'

declare module '@vitest/browser/context' {
    interface BrowserCommands{
        mouseDown(): Promise<void>;
        mouseUp(): Promise<void>;
        mouseMove(
            elementText: string,
            xMove: number,
            yMove: number,
        ): Promise<void>;
        mouseFind(elementText: string): Promise<void>;
        resizeViewport(width: number, height: number): Promise<void>;
    }
}

const resizeViewport: BrowserCommand<[number, number]> = async ({ page }, width, height) => {
    await page.setViewportSize({ width, height });
};

const mouseDown: BrowserCommand<[]> = async ( ctx ) => {
    if (ctx.provider.name === 'playwright') {
        await ctx.page.mouse.down()
    }
}

const mouseUp: BrowserCommand<[]> = async ( ctx ) => {
    if (ctx.provider.name === 'playwright') {
        await ctx.page.mouse.up()
    }
}

const mouseFind: BrowserCommand<[string]> = async (
    ctx,
    elementText,
) => {
    if (ctx.provider.name === 'playwright') {
        const box  = await ctx.iframe.getByText(elementText).boundingBox();
        if (!box) throw new Error("Could not find element in iframe");
        const { x, y, width, height } = box;
        await ctx.page.mouse.move(x + width / 2, y + height / 2);
    }
}

const mouseMove: BrowserCommand<[string, number, number]> = async (
    ctx,
    elementText,
    xMove,
    yMove,
) => {
    if (ctx.provider.name === 'playwright') {
        const box  = await ctx.iframe.getByText(elementText).boundingBox();
        if (!box) throw new Error("Could not find element in iframe");
        const { x, y, width, height } = box;
        await ctx.page.mouse.move(x + width / 2 + xMove, y + height / 2 + yMove);
    }
}

export default defineConfig(({mode}: any) => {
    let headless: boolean = false;
    if (mode=="headless") headless = true

    return {
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
                        headless: headless,
                    },
                    {
                        browser: 'firefox',
                        headless: headless,
                    },
                    {
                        browser: 'webkit',
                        headless: headless,
                    },
                ],
                commands: {
                    mouseDown,
                    mouseUp,
                    mouseFind,
                    mouseMove,
                    resizeViewport,
                },
            },
            exclude: [ '**/server*' ],
        },
    };
});
