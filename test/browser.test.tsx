import { ComponentProps, createSignal, type ParentProps } from 'solid-js'
import { isServer } from 'solid-js/web'
import { render, waitFor } from '@solidjs/testing-library'

import { describe, expect, it, beforeAll, afterEach, afterAll, vi} from 'vitest'
import { page,  commands } from '@vitest/browser/context'

import { DragAndResize, type State, type Bounds } from '../src'
import { type Direction } from '../src/resize'

// Reference
// Setting State
// Drag
// Resize
// Drag with boundaries
// Drag and resize with boundaries
// Resize with minSize
// Resize with maxSize
// Action callbacks with logging
// Action callbacks with custom amended state
// Drag with class change
// Resize with class change
// Drag handles
// Resize handle props
// Custom resize handle
// Everything together (smoke)
// Helper function to get the computed style

const getComputedStyle = (element: HTMLElement) => {
    return window.getComputedStyle(element);
};

// Don't make the default delay any smaller
const waitForRender = async (delay=10) => await new Promise(resolve => setTimeout(resolve, delay));

const simulateDrag = async (
    element: HTMLElement,
    x: number,
    y: number,
) => {
    if (!element.textContent) throw Error("Tried dragging element without locator")
    await commands.mouseFind(element.textContent);
    await commands.mouseDown();
    await commands.mouseMove(element.textContent, x, y);
    await commands.mouseUp();
};


let initialSize: {
    width: number,
    height: number,
};

beforeAll(() => {
    /*initialSize = {
        width: window.outerWidth,
        height: window.outerHeight,
    }*/
    commands.resizeViewport(1920, 1080);
});

afterEach(() => {
    for (const child of document.body.children) {
        const el = child as HTMLElement;
        el.style.display = "none";
    }
});

afterAll(() => {
    for (const child of document.body.children) {
        const el = child as HTMLElement;
        el.style.display = "block";
    }
    //commands.resizeViewport(initialSize.width, initialSize.height);
    commands.resizeViewport(1300, 720);
});

describe('Environment', () => {
    it('Runs on client', () => {
        expect(typeof window).toBe('object')
        expect(isServer).toBe(false)
    })
})

describe('Basic rendering', () => {
    it('renders correctly', async () => {
            const { getByText } = render(() => <DragAndResize>Hello World!</DragAndResize>);
            await expect.element(getByText("Hello World!")).toBeInTheDocument();
    })

    it('renders correctly with changing text', async () => {
            const [text, setText] = createSignal('Hello World!')
            const { getByText } = render(() => <DragAndResize>{text()}</DragAndResize>);
            await expect.element(getByText("Hello World!")).toBeInTheDocument();
            setText('Hello Drag and Resize!');

            waitForRender();
            await expect.element(getByText("Hello Drag and Resize!")).toBeInTheDocument();
    })
})

describe('Basic props', () => {
    it('should begin state at initialState', async () => {
        const initialState: State = {
            x: 100,
            y: 100,
            width: 200,
            height: 200,
        };
        const { getByText} = render(() => (
            <div style="margin:50px;width:400px;height:400px;">
                <DragAndResize initialState={initialState}>initialState</DragAndResize>
            </div>
        ));
        queueMicrotask(() => {
            const rect = getByText("initialState").getBoundingClientRect();
            expect(rect.x).toEqual(150);
            expect(rect.y).toEqual(150);
            expect(rect.width).toEqual(200);
            expect(rect.height).toEqual(200);
        });
    })

    it('should update state when the state prop changes', async () => {
        const [currentState, setCurrentState] = createSignal<Partial<State>>({
            x: 50,
            y: 50,
            width: 100,
            height: 100,
        });
        const { getByText } = render(() => (
            <DragAndResize state={currentState()}>StateProp</DragAndResize>
        ));

        const element = getByText("StateProp") as HTMLElement;
        waitForRender();

        let rect = element.getBoundingClientRect();
        expect(rect.x).toEqual(50);
        expect(rect.y).toEqual(50);
        expect(rect.width).toEqual(100);
        expect(rect.height).toEqual(100);

        // Full update
        setCurrentState({ x: 150, y: 150, width: 200, height: 200 });
        waitForRender();

        rect = element.getBoundingClientRect();
        expect(rect.x).toEqual(150);
        expect(rect.y).toEqual(150);
        expect(rect.width).toEqual(200);
        expect(rect.height).toEqual(200);

        // Partial update
        setCurrentState({x: 250 });
        waitForRender();

        rect = element.getBoundingClientRect();
        expect(rect.x).toEqual(250);
        expect(rect.y).toEqual(150);
        expect(rect.width).toEqual(200);
        expect(rect.height).toEqual(200);
    });
})

describe('Drag functionality', async () => {
    it('should drag the component', async () => {
        const textContent = "Basic Dragging"
        const { getByText } = render(() => (
            <DragAndResize initialState={{ x: 0, y: 0, width: 100, height: 100 }}>
                {textContent}
            </DragAndResize>
        ));

        const element = getByText(textContent) as HTMLElement;
        waitForRender();

        const initialRect = element.getBoundingClientRect();
        expect(initialRect.x).toBeCloseTo(0);
        expect(initialRect.y).toBeCloseTo(0);

        await simulateDrag(element, 50, 50);
        waitForRender();

        const finalRect = element.getBoundingClientRect();
        expect(finalRect.x).toBeCloseTo(50);
        expect(finalRect.y).toBeCloseTo(50);
    });

    it('should drag using the specified handle (string selector)', async () => {
        const { getByText } = render(() => (
            <DragAndResize initialState={{ x: 0, y: 0, width: 100, height: 100 }} dragHandle=".handle">
                <div class="handle">Drag Handle</div>
                <div>Content</div>
            </DragAndResize>
        ));

        const handle = getByText("Drag Handle");
        const element = handle.parentElement!;

        await new Promise(resolve => setTimeout(resolve, 0));

        let rect = element.getBoundingClientRect();
        expect(rect.left).toBeCloseTo(0);
        expect(rect.top).toBeCloseTo(0);

        // Attempt to drag the component itself (should not work)
        await simulateDrag(element, 50, 50);
        rect = element.getBoundingClientRect();
        expect(rect.left).toBeCloseTo(0);
        expect(rect.top).toBeCloseTo(0);

        // Drag using the handle
        await simulateDrag(handle, 50, 50);
        rect = element.getBoundingClientRect();
        expect(rect.left).toBeCloseTo(50);
        expect(rect.top).toBeCloseTo(50);
    });

    it('should add classWhileDragging during drag and remove it afterwards', async () => {
        const testClass = "dragging-test-class";
        const textContent = "Draggable With Class"
        const { getByText } = render(() => (
            <DragAndResize
                id="thing"
                class="thing"
                classWhileDragging={testClass}>
                {textContent}
            </DragAndResize>
        ));
        const element = getByText(textContent);

        expect(element).not.toHaveClass(testClass);

        await commands.mouseFind(textContent);
        await commands.mouseDown();
        await waitForRender(100);
        expect(element).toHaveClass(testClass);

        await commands.mouseMove(textContent, 50, 50);
        await waitForRender(100);
        expect(element).toHaveClass(testClass);

        await commands.mouseUp();
        await waitForRender(100);
        expect(element).not.toHaveClass(testClass);
    });

    it('should call dragStart, drag, and dragEnd callbacks', async () => {
        const dragStartMock = vi.fn();
        const dragMock = vi.fn();
        const dragEndMock = vi.fn();

        const textContent = "Dragging Callbacks"
        const { getByText } = render(() => (
            <DragAndResize
                initialState={{ x: 0, y: 0, width: 100, height: 100 }}
                dragStart={dragStartMock}
                drag={dragMock}
                dragEnd={dragEndMock}
            >
                {textContent}
            </DragAndResize>
        ));
        await waitForRender();

        await commands.mouseFind(textContent);
        await commands.mouseDown();
        await waitForRender();
        expect(dragStartMock).toHaveBeenCalledTimes(1);
        expect(dragMock).not.toHaveBeenCalled();
        expect(dragEndMock).not.toHaveBeenCalled();

        await commands.mouseMove(textContent, 10, 10);
        await waitForRender();
        expect(dragMock).toHaveBeenCalledTimes(1);
        expect(dragMock).toHaveBeenCalledWith(
            expect.any(PointerEvent),
            expect.objectContaining({
                x: expect.any(Number),
                y: expect.any(Number),
            }),
            expect.objectContaining({
                x: expect.any(Number),
                y: expect.any(Number),
                width: expect.any(Number),
                height: expect.any(Number),
            }),
        );

        await commands.mouseMove(textContent, 20, 20);
        await waitForRender();
        expect(dragMock).toHaveBeenCalledTimes(2);
        expect(dragMock).toHaveBeenCalledWith(
            expect.any(PointerEvent),
            expect.objectContaining({
                x: expect.any(Number),
                y: expect.any(Number),
            }),
            expect.objectContaining({
                x: expect.any(Number),
                y: expect.any(Number),
                width: expect.any(Number),
                height: expect.any(Number),
            }),
        );

        await commands.mouseUp();
        await waitForRender();
        expect(dragEndMock).toHaveBeenCalledTimes(1);
        expect(dragEndMock).toHaveBeenCalledWith(
            expect.any(PointerEvent),
            expect.objectContaining({
                x: expect.any(Number),
                y: expect.any(Number),
            }),
            expect.objectContaining({
                x: expect.any(Number),
                y: expect.any(Number),
                width: expect.any(Number),
                height: expect.any(Number),
            }),
        );
        expect(dragStartMock).toHaveBeenCalledTimes(1); // Should still be 1
    });

    it('should allow dragStart to return new state', async () => {
        const textContent = "dragStart callback test"
        const { getByText } = render(() => (
            <DragAndResize
                initialState={{ x: 0, y: 0, width: 100, height: 100 }}
                dragStart={() => ({ x: 50, y: 50, width: 100, height: 100 })}
            >
                {textContent}
            </DragAndResize>
        ));
        await waitForRender();
        const element = getByText(textContent) as HTMLElement;

        let rect = element.getBoundingClientRect();
        expect(rect.left).toBeCloseTo(0);
        expect(rect.top).toBeCloseTo(0);

        await commands.mouseFind(textContent);
        await commands.mouseDown();
        await waitForRender();
        rect = element.getBoundingClientRect();
        expect(rect.left).toBeCloseTo(50);
        expect(rect.top).toBeCloseTo(50);
        await commands.mouseUp();
    });

    it.skip('should allow drag to return new state', async () => {
        const textContent = "drag callback test"
        const { getByText } = render(() => (
            <DragAndResize
                initialState={{ x: 0, y: 0, width: 100, height: 100 }}
                drag={(e, offset, state) => ({ x: 50, y: 50, width: 100, height: 100 })}
            >
                {textContent}
            </DragAndResize>
        ));
        await waitForRender();
        const element = getByText(textContent) as HTMLElement;

        let rect = element.getBoundingClientRect();
        expect(rect.left).toBeCloseTo(0);
        expect(rect.top).toBeCloseTo(0);

        await commands.mouseFind(textContent);
        await commands.mouseDown();
        await commands.mouseMove(textContent, 20, 20);
        await waitForRender();
        rect = element.getBoundingClientRect();
        expect(rect.left).toBeCloseTo(50);
        expect(rect.top).toBeCloseTo(50);
        await commands.mouseUp();
    });

    it('should allow dragEnd to return new state', async () => {
        const textContent = "dragEnd callback test"
        const { getByText } = render(() => (
            <DragAndResize
                initialState={{ x: 0, y: 0, width: 100, height: 100 }}
                dragEnd={() => ({ x: 100, y: 100, width: 100, height: 100 })}
            >
                {textContent}
            </DragAndResize>
        ));
        await waitForRender();
        const element = getByText(textContent) as HTMLElement;

        let rect = element.getBoundingClientRect();
        expect(rect.left).toBeCloseTo(0);
        expect(rect.top).toBeCloseTo(0);

        await commands.mouseFind(textContent);
        await commands.mouseDown();
        await commands.mouseMove(textContent, 50, 50);
        await waitForRender()
        rect = element.getBoundingClientRect();
        expect(rect.left).toBeCloseTo(50);
        expect(rect.top).toBeCloseTo(50);

        await commands.mouseUp();
        await waitForRender()
        rect = element.getBoundingClientRect();
        expect(rect.left).toBeCloseTo(100);
        expect(rect.top).toBeCloseTo(100);
    });

    it.skip('should respect boundaries "window" during drag', async () => {
        // Mock window dimensions for consistent testing
        const originalWindowInnerWidth = window.innerWidth;
        const originalWindowInnerHeight = window.innerHeight;
        Object.defineProperty(window, 'innerWidth', { writable: true, value: 500 });
        Object.defineProperty(window, 'innerHeight', { writable: true, value: 500 });

        const { getByText } = render(() => (
            <DragAndResize
                initialState={{ x: 0, y: 0, width: 100, height: 100 }}
                boundary="window"
            >
                Bounded Drag
            </DragAndResize>
        ));
        waitForRender();
        const element = getByText("Bounded Drag") as HTMLElement;

        // Drag far right and down
        await simulateDrag(element, 600, 600);
        let rect = element.getBoundingClientRect()
        expect(rect.right).toBeCloseTo(0);
        expect(rect.bottom).toBeCloseTo(0);

        // Drag far left and up
        await simulateDrag(element, -1000, -1000);
        rect = element.getBoundingClientRect()
        expect(rect.top).toBeCloseTo(0);
        expect(rect.left).toBeCloseTo(0);

        // Restore original window dimensions
        Object.defineProperty(window, 'innerWidth', { writable: true, value: originalWindowInnerWidth });
        Object.defineProperty(window, 'innerHeight', { writable: true, value: originalWindowInnerHeight });
    });

    it.skip('should respect boundaries "parent" during drag', async () => {
        const { getByText } = render(() => (
            <div style="width: 300px; height: 300px; margin: 10px; padding: 10px;">
                <DragAndResize
                    initialState={{ x: 0, y: 0, width: 50, height: 50 }}
                    boundary="parent"
                >
                    Bounded Parent Drag
                </DragAndResize>
            </div>
        ));
        waitForRender();
        const element = getByText("Bounded Parent Drag") as HTMLElement;
        const parent = element.parentElement as HTMLElement;

        let rect = element.getBoundingClientRect()
        // 10 margin + 10 padding = 20 relative to viewport
        expect(rect.top).toBeCloseTo(20);
        expect(rect.left).toBeCloseTo(20);

        await simulateDrag(element, 400, 400);
        rect = element.getBoundingClientRect()
        expect(rect.top).toBeCloseTo(310-50); // pWidth + pMargin - cWidth
        expect(rect.left).toBeCloseTo(310-50);

        // Simulate drag past left/top boundary
        await simulateDrag(element, -500, -500);
        rect = element.getBoundingClientRect()
        expect(rect.top).toBeCloseTo(20);
        expect(rect.left).toBeCloseTo(20);
    });

    it.skip('should respect custom boundaries during drag', async () => {
        const customBounds: Bounds = { top: 10, right: 290, bottom: 290, left: 10 };

        const { getByText } = render(() => (
            <DragAndResize
                initialState={{ x: 0, y: 0, width: 50, height: 50 }}
                boundary={customBounds}
            >
                Custom Bounded Drag
            </DragAndResize>
        ));
        waitForRender();
        const element = getByText("Custom Bounded Drag") as HTMLElement;

        let rect = element.getBoundingClientRect()
        expect(rect.top).toBeCloseTo(0);
        expect(rect.left).toBeCloseTo(0);

        // Simulate drag past right/bottom boundary
        await simulateDrag(element, 400, 400);
        rect = element.getBoundingClientRect()
        expect(rect.top).toBeCloseTo(window.innerHeight - 10 - 50);
        expect(rect.left).toBeCloseTo(window.innerWidth - 10 - 50);

        // Simulate drag past left/top boundary
        await simulateDrag(element, -1000, -1000);
        rect = element.getBoundingClientRect()
        expect(rect.top).toBeCloseTo(10);
        expect(rect.left).toBeCloseTo(10);
    });
})

