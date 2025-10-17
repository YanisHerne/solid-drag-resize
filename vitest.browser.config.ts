/// <reference types="@vitest/browser/providers/playwright" />
import { ConfigEnv, defineConfig } from 'vitest/config'
import solid from 'vite-plugin-solid'
import { type BrowserCommand } from 'vitest/node'
import { type BrowserCommands } from '@vitest/browser/context'

declare module '@vitest/browser/context' {
    interface BrowserCommands{
        mouseDown(): Promise<void>;
        mouseUp(): Promise<void>;
        mouseMove(
            locator: "byText"|"byTestId",
            elementText: string,
            xMove: number,
            yMove: number,
        ): Promise<void>;
        mouseFind(
            locator: "byText"|"byTestId",
            elementText: string
        ): Promise<void>;
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

const getScaleFloat = (inputString: string): number | undefined => {
    const regex = /scale\(\s*(-?\d+(\.\d+)?)\s*\)/;
    const match = inputString.match(regex);

    if (match && match[1]) {
        return parseFloat(match[1]);
    } else {
        return undefined;
    }
}

const mouseFind: BrowserCommand<["byText"|"byTestId", string]> = async (
    ctx,
    locator,
    elementText,
) => {
    if (ctx.provider.name === 'playwright') {
        let box: { x: number, y: number, height: number, width: number} | null = null;
        if (locator === "byText")
            box  = await ctx.iframe.getByText(elementText).boundingBox();
        if (locator === "byTestId")
            box  = await ctx.iframe.getByTestId(elementText).boundingBox();
        if (!box) throw new Error("Could not find element in iframe");
        const { x, y, width, height } = box;

        await ctx.page.mouse.move(x + width / 2, y + height / 2);
    }
}

let foo: boolean = false;
const mouseMove: BrowserCommand<["byText"|"byTestId", string, number, number]> = async (
    ctx,
    locator,
    elementText,
    xMove,
    yMove,
) => {
    if (ctx.provider.name === 'playwright') {
        let box: { x: number, y: number, height: number, width: number} | null = null;
        if (locator === "byText")
            box  = await ctx.iframe.getByText(elementText).boundingBox();
        if (locator === "byTestId")
            box  = await ctx.iframe.getByTestId(elementText).boundingBox();
        if (!box) throw new Error("Could not find element in iframe");
        const { x, y, width, height } = box;

        const style = await ctx.page.locator("#tester-ui").getAttribute("style");
        if (!style) throw new Error("Can't find style");
        const scale = getScaleFloat(style) ?? 1; // Default to one
        if (!foo) {
            console.log("Scale: " + scale);
            foo = true;
        }
        if (!scale) throw new Error("Can't find scale");
        const scaledX = xMove * scale;
        const scaledY = yMove * scale;

        await ctx.page.mouse.move(x + width / 2 + scaledX, y + height / 2 + scaledY);
    }
}

export default defineConfig(({ mode }: ConfigEnv) => {
    let instances: Array<{
        browser: 'chromium'|'firefox'|'webkit',
        headless: boolean,
    }> = [];

    if (mode == "headless") {
        instances = [
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
        ];
    } else if (mode == "coverage") {
        instances = [
            {
                browser: 'chromium',
                headless: true,
            },
        ];
    } else {
        instances = [
            {
                browser: 'chromium',
                headless: false,
            },
            {
                browser: 'firefox',
                headless: false,
            },
            {
                browser: 'webkit',
                headless: false,
            },
        ];
    }

    return {
        plugins: [solid()],
        test: {
            coverage: {
                include: [ '**/src' ],
            },
            dir: 'test',
            browser: {
                //ui: false,
                screenshotFailures: false,
                viewport: {
                    width: 1920,
                    height: 1080,
                },
                enabled: true,
                provider: 'playwright',
                // https://vitest.dev/guide/browser/playwright
                instances: instances,
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
