import { createSignal } from 'solid-js'
import { isServer } from 'solid-js/web'
import { render, waitFor } from '@solidjs/testing-library'

import { describe, expect, it, beforeAll, afterEach, afterAll, vi} from 'vitest'
import { page,  commands } from '@vitest/browser/context'

import { DragAndResize, type State, type Bounds } from '../src'
import { type Direction } from '../src/resize'

// Don't make the default delay any smaller
const waitForRender = async (delay=10) => await new Promise(resolve => setTimeout(resolve, delay));

const simulateDrag = async (
    element: HTMLElement,
    x: number,
    y: number,
) => {
    if (!element.textContent) throw Error("Tried dragging element without locator")
    await commands.mouseFind("byText", element.textContent);
    await commands.mouseDown();
    await commands.mouseMove("byText", element.textContent, x, y);
    await commands.mouseUp();
};

const simulateResize = async (
    elementTestId: string,
    x: number,
    y: number,
) => {
    await commands.mouseFind("byTestId", elementTestId);
    await commands.mouseDown();
    await commands.mouseMove("byTestId", elementTestId, x, y);
    await commands.mouseUp();
};

let initialSize: {
    width: number,
    height: number,
};

beforeAll(() => {
    initialSize = {
        width: window.outerWidth,
        height: window.innerHeight,
    };
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
    commands.resizeViewport(initialSize.width, initialSize.height);
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
        await waitForRender();

        let rect = element.getBoundingClientRect();
        expect(rect.x).toEqual(50);
        expect(rect.y).toEqual(50);
        expect(rect.width).toEqual(100);
        expect(rect.height).toEqual(100);

        // Full update
        setCurrentState({ x: 150, y: 150, width: 200, height: 200 });
        await waitForRender();

        rect = element.getBoundingClientRect();
        expect(rect.x).toEqual(150);
        expect(rect.y).toEqual(150);
        expect(rect.width).toEqual(200);
        expect(rect.height).toEqual(200);

        // Partial update
        setCurrentState({x: 250 });
        await waitForRender();

        rect = element.getBoundingClientRect();
        expect(rect.x).toEqual(250);
        expect(rect.y).toEqual(150);
        expect(rect.width).toEqual(200);
        expect(rect.height).toEqual(200);
    });

    it('should allow access to the element reference', async () => {
        const textContent = "Get Reference";
        let ref: HTMLElement | undefined = undefined;
        const { getByText } = render(() => (
            <DragAndResize ref={ref}>
                {textContent}
            </DragAndResize>
        ));
        const element = getByText(textContent);
        await waitForRender();
        expect(ref).toEqual(element);
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
        await waitForRender();

        const initialRect = element.getBoundingClientRect();
        expect(initialRect.x).toBeCloseTo(0);
        expect(initialRect.y).toBeCloseTo(0);

        await simulateDrag(element, 50, 50);
        await waitForRender();

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

        await commands.mouseFind("byText", textContent);
        await commands.mouseDown();
        await waitForRender(100);
        expect(element).toHaveClass(testClass);

        await commands.mouseMove("byText", textContent, 50, 50);
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

        await commands.mouseFind("byText", textContent);
        await commands.mouseDown();
        await waitForRender();
        expect(dragStartMock).toHaveBeenCalledTimes(1);
        expect(dragMock).not.toHaveBeenCalled();
        expect(dragEndMock).not.toHaveBeenCalled();

        await commands.mouseMove("byText", textContent, 10, 10);
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

        await commands.mouseMove("byText", textContent, 20, 20);
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

        await commands.mouseFind("byText", textContent);
        await commands.mouseDown();
        await waitForRender();
        rect = element.getBoundingClientRect();
        expect(rect.left).toBeCloseTo(50);
        expect(rect.top).toBeCloseTo(50);
        await commands.mouseUp();
    });

    it('should allow drag to return new state', async () => {
        const textContent = "drag callback test"
        const { getByText } = render(() => (
            <DragAndResize
                initialState={{ x: 0, y: 0, width: 100, height: 100 }}
                drag={(e, offset, state) => {
                    return { x: 50, y: 50, width: 100, height: 100 }
                }}
            >
                {textContent}
            </DragAndResize>
        ));
        await waitForRender();
        const element = getByText(textContent) as HTMLElement;

        let rect = element.getBoundingClientRect();
        expect(rect.left).toBeCloseTo(0);
        expect(rect.top).toBeCloseTo(0);

        await commands.mouseFind("byText", textContent);
        await commands.mouseDown();
        await commands.mouseMove("byText", textContent, 20, 20);
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

        await commands.mouseFind("byText", textContent);
        await commands.mouseDown();
        await commands.mouseMove("byText", textContent, 50, 50);
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

    it('should ignore boundary `undefined` during dragging', async () => {
        const textContent = "Resize-Undefined-Boundary";
        const { getByText } = render(() => (
            <DragAndResize
                initialState={{ x: 0, y: 0, width: 100, height: 100 }}
                boundary={undefined}
            >
                {textContent}
            </DragAndResize>
        ));
        await waitForRender();
        const element = getByText(textContent);
        let rect = element.getBoundingClientRect();
        expect(rect.x).toBeCloseTo(0);
        expect(rect.y).toBeCloseTo(0);

        await simulateDrag(element, -20, -20);
        await waitForRender();
        rect = element.getBoundingClientRect();
        expect(rect.x).toBeCloseTo(-20);
        expect(rect.y).toBeCloseTo(-20);
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

    it('should respect boundaries "parent" during drag', async () => {
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

        await waitForRender();
        const element = getByText("Custom Bounded Drag") as HTMLElement;

        let parentRect = element.parentElement?.getBoundingClientRect();
        if (!parentRect) throw Error("Weird parent element problem");

        let rect = element.getBoundingClientRect()
        expect(rect.top).toBeCloseTo(0);
        expect(rect.left).toBeCloseTo(0);

        // Simulate drag past right/bottom boundary
        await simulateDrag(element, 50, 50);
        rect = element.getBoundingClientRect()
        expect(rect.top).toBeCloseTo(parentRect.height - 10 - 50);
        expect(rect.left).toBeCloseTo(parentRect.width - 10 - 50);

//        // Simulate drag past left/top boundary
//        await simulateDrag(element, -1000, -1000);
//        rect = element.getBoundingClientRect()
//        expect(rect.top).toBeCloseTo(10);
//        expect(rect.left).toBeCloseTo(10);
    });
})

const createHandleIds = (prefix: string): { [key in Direction]: { "data-testid": string} } => {
    const result = {
        "top": {},
        "right": {},
        "bottom": {},
        "left": {},
        "topRight": {},
        "bottomRight": {},
        "bottomLeft": {},
        "topLeft": {},
    }
    for (const key in result) {
        result[key as Direction] = { "data-testid": prefix + "-" + key}
    }
    return result as { [key in Direction]: { "data-testid": string} };
}

describe('Resize functionality', async () => {

    it('should resize the component from the "bottomRight" handle', async () => {
        const textContent = "Basic-Resizing";
        const handleIds = createHandleIds(textContent);
        const { getByText } = render(() => (
            <DragAndResize
                initialState={{ x: 0, y: 0, width: 100, height: 100 }}
                resizeHandleProps={handleIds}
            >
                {textContent}
            </DragAndResize>
        ));

        const element = getByText(textContent) as HTMLElement;
        await waitForRender();

        const initialRect = element.getBoundingClientRect();
        expect(initialRect.width).toBeCloseTo(100);
        expect(initialRect.height).toBeCloseTo(100);

        await simulateResize(handleIds.bottomRight['data-testid'], 50, 50);
        await waitForRender(100);

        const finalRect = element.getBoundingClientRect();
        expect(finalRect.width).toBeCloseTo(150);
        expect(finalRect.height).toBeCloseTo(150);
        expect(finalRect.x).toBeCloseTo(initialRect.x);
        expect(finalRect.y).toBeCloseTo(initialRect.y);
    });

    it('should respect minSize', async () => {
        const textContent = "Min-Size-Resizing";
        const handleIds = createHandleIds(textContent);
        const { getByText } = render(() => (
            <DragAndResize
                initialState={{ x: 0, y: 0, width: 100, height: 100 }}
                resizeHandleProps={handleIds}
                minSize={{ width: 75, height: 75 }}
            >
                {textContent}
            </DragAndResize>
        ));

        await waitForRender();
        const element = getByText(textContent);

        let rect = element.getBoundingClientRect();
        expect(rect.width).toBeCloseTo(100);
        expect(rect.height).toBeCloseTo(100);

        await simulateResize(handleIds.bottomRight["data-testid"], -50, -50);
        await waitForRender();

        rect = element.getBoundingClientRect();
        expect(rect.width).toBeCloseTo(75);
        expect(rect.height).toBeCloseTo(75);

        await simulateResize(handleIds.topLeft["data-testid"], 50, 50);
        await waitForRender();

        rect = element.getBoundingClientRect();
        expect(rect.width).toBeCloseTo(75);
        expect(rect.height).toBeCloseTo(75);
    });

    it('should respect maxSize', async () => {
        const textContent = "Max Size Resizing";
        const handleIds = createHandleIds(textContent);
        const { getByText } = render(() => (
            <DragAndResize
                initialState={{ x: 0, y: 0, width: 100, height: 100 }}
                resizeHandleProps={handleIds}
                maxSize={{ width: 150, height: 150 }}
            >
                {textContent}
            </DragAndResize>
        ));

        await waitForRender();
        const element = getByText(textContent);

        let rect = element.getBoundingClientRect();
        expect(rect.width).toBeCloseTo(100);
        expect(rect.height).toBeCloseTo(100);

        await simulateResize(handleIds.bottomRight["data-testid"], 100, 100);
        await waitForRender(100);

        rect = element.getBoundingClientRect();
        expect(rect.width).toBeCloseTo(150);
        expect(rect.height).toBeCloseTo(150);

        await simulateResize(handleIds.topLeft["data-testid"], -50, -50);
        await waitForRender(100);

        rect = element.getBoundingClientRect();
        expect(rect.width).toBeCloseTo(150);
        expect(rect.height).toBeCloseTo(150);
    });

    it('should call resizeStart, resize, and resizeEnd callbacks', async () => {
        const resizeStartMock = vi.fn();
        const resizeMock = vi.fn();
        const resizeEndMock = vi.fn();

        const textContent = "Resizing-Callbacks"
        const handleIds = createHandleIds(textContent);
        const { getByText } = render(() => (
            <DragAndResize
                initialState={{ x: 0, y: 0, width: 100, height: 100 }}
                resizeHandleProps={handleIds}
                resizeStart={resizeStartMock}
                resize={resizeMock}
                resizeEnd={resizeEndMock}
            >
                {textContent}
            </DragAndResize>
        ));

        await waitForRender();
        const element = getByText(textContent);
        expect(resizeStartMock).not.toHaveBeenCalled();
        expect(resizeMock).not.toHaveBeenCalled();
        expect(resizeEndMock).not.toHaveBeenCalled();

        await commands.mouseFind("byTestId", handleIds.bottomRight["data-testid"]);
        await commands.mouseDown();
        await waitForRender(100);
        expect(resizeStartMock).toHaveBeenCalledTimes(1);
        expect(resizeMock).not.toHaveBeenCalled();
        expect(resizeEndMock).not.toHaveBeenCalled();

        await commands.mouseMove("byTestId", handleIds.bottomRight["data-testid"], 50, 50);
        await waitForRender();
        expect(resizeMock).toHaveBeenCalledTimes(1);
        expect(resizeMock).toHaveBeenCalledWith(
            expect.any(PointerEvent),
            "bottomRight",
            expect.objectContaining({
                amended: expect.objectContaining({
                    x: expect.any(Number),
                    y: expect.any(Number),
                    width: expect.any(Number),
                    height: expect.any(Number),
                }),
                init: expect.objectContaining({
                    x: expect.any(Number),
                    y: expect.any(Number),
                    width: expect.any(Number),
                    height: expect.any(Number),
                }),
                proposed: expect.objectContaining({
                    x: expect.any(Number),
                    y: expect.any(Number),
                    width: expect.any(Number),
                    height: expect.any(Number),
                }),
                type: "resize",
            }),
        );

        await commands.mouseMove("byTestId", handleIds.bottomRight["data-testid"], 50, 50);
        await waitForRender();
        expect(resizeMock).toHaveBeenCalledTimes(2);
        expect(resizeMock).toHaveBeenCalledWith(
            expect.any(PointerEvent),
            "bottomRight", // Use string literal "bottomRight"
            expect.objectContaining({
                amended: expect.objectContaining({
                    x: expect.any(Number),
                    y: expect.any(Number),
                    width: expect.any(Number),
                    height: expect.any(Number),
                }),
                init: expect.objectContaining({
                    x: expect.any(Number),
                    y: expect.any(Number),
                    width: expect.any(Number),
                    height: expect.any(Number),
                }),
                proposed: expect.objectContaining({
                    x: expect.any(Number),
                    y: expect.any(Number),
                    width: expect.any(Number),
                    height: expect.any(Number),
                }),
                type: "resize",
            }),
        );

        await commands.mouseUp();
        await waitForRender();
        expect(resizeStartMock).toHaveBeenCalledTimes(1); // Should still be 1
        expect(resizeMock).toHaveBeenCalledTimes(2); // SHould still be 2
        expect(resizeEndMock).toHaveBeenCalledTimes(1);
        expect(resizeEndMock).toHaveBeenCalledWith(
            expect.any(PointerEvent),
            "bottomRight",
            expect.objectContaining({
                amended: expect.objectContaining({
                    x: expect.any(Number),
                    y: expect.any(Number),
                    width: expect.any(Number),
                    height: expect.any(Number),
                }),
                init: expect.objectContaining({
                    x: expect.any(Number),
                    y: expect.any(Number),
                    width: expect.any(Number),
                    height: expect.any(Number),
                }),
                proposed: expect.objectContaining({
                    x: expect.any(Number),
                    y: expect.any(Number),
                    width: expect.any(Number),
                    height: expect.any(Number),
                }),
                type: "resize",
            }),
        );
    });

    it('should disable resize when enabled.resize is false', async () => {
        const textContent = "Disable-Resize-Test";
        const handleIds = createHandleIds(textContent);
        const { getByText } = render(() => (
            <DragAndResize
                initialState={{ x: 0, y: 0, width: 100, height: 100 }}
                resizeHandleProps={handleIds}
                enabled={{ drag: true, resize: false }}
            >
                {textContent}
            </DragAndResize>
        ));

        await waitForRender();
        const element = getByText(textContent);

        let rect = element.getBoundingClientRect();
        expect(rect.width).toBeCloseTo(100);
        expect(rect.height).toBeCloseTo(100);
        expect(rect.x).toBeCloseTo(0);
        expect(rect.y).toBeCloseTo(0);

        await simulateResize(handleIds.bottomRight["data-testid"], 50, 50);
        await waitForRender();

        rect = element.getBoundingClientRect();
        expect(rect.width).toBeCloseTo(100);
        expect(rect.height).toBeCloseTo(100);

        // The resize will become a drag b/c of event bubbling
        expect(rect.x).toBeCloseTo(50);
        expect(rect.y).toBeCloseTo(50);

        // Check if drag still works (since drag is true)
        await simulateDrag(element, 50, 50);
        await waitForRender();
        rect = element.getBoundingClientRect();
        expect(rect.x).toBeCloseTo(100);
        expect(rect.y).toBeCloseTo(100);
    });

    it('should disable resize when enabled is false', async () => {
        const textContent = "Disable-All-Resize-Test";
        const handleIds = createHandleIds(textContent);
        const { getByText } = render(() => (
            <DragAndResize
                initialState={{ x: 0, y: 0, width: 100, height: 100 }}
                resizeHandleProps={handleIds}
                enabled={false}
            >
                {textContent}
            </DragAndResize>
        ));

        await waitForRender();
        const element = getByText(textContent);
        let rect = element.getBoundingClientRect();
        expect(rect.width).toBeCloseTo(100);
        expect(rect.height).toBeCloseTo(100);

        await simulateResize(handleIds.bottomRight["data-testid"], 50, 50);
        await waitForRender();
        rect = element.getBoundingClientRect();
        expect(rect.width).toBeCloseTo(100);
        expect(rect.height).toBeCloseTo(100);

        await simulateDrag(element, 50, 50);
        await waitForRender();
        rect = element.getBoundingClientRect();
        expect(rect.x).toBeCloseTo(0);
        expect(rect.y).toBeCloseTo(0);
    });

    it('should ignore boundary `undefined` during resizing', async () => {
        const textContent = "Resize-Undefined-Boundary";
        const handleIds = createHandleIds(textContent);
        const { getByText } = render(() => (
            <DragAndResize
                initialState={{ x: 0, y: 0, width: 100, height: 100 }}
                resizeHandleProps={handleIds}
                boundary={undefined}
            >
                {textContent}
            </DragAndResize>
        ));
        await waitForRender();
        const element = getByText(textContent);
        const parentRect = element.parentElement?.getBoundingClientRect();
        if (!parentRect) throw new Error("Something weird happened")

        let rect = element.getBoundingClientRect();
        expect(rect.width).toBeCloseTo(100);
        expect(rect.height).toBeCloseTo(100);

        expect(parentRect.width).toBeLessThan(400);
        expect(parentRect.height).toBeLessThan(400);

        await simulateResize(handleIds.bottomRight["data-testid"], 400, 400);
        rect = element.getBoundingClientRect();
        expect(rect.width).toBeCloseTo(500);
        expect(rect.height).toBeCloseTo(500);

        expect(parentRect.width).toBeLessThan(400);
        expect(parentRect.height).toBeLessThan(400);
    });

    it('should respect boundary "window" during resizing', async () => {
        const textContent = "Resize-Window-Boundary";
        const handleIds = createHandleIds(textContent);
        const { getByText } = render(() => (
            <DragAndResize
                initialState={{ x: 10, y: 10, width: 100, height: 100 }}
                resizeHandleProps={handleIds}
                boundary="window"
            >
                {textContent}
            </DragAndResize>
        ));

        await waitForRender();
        const element = getByText(textContent);

        await simulateDrag(element, 15, 15);
        await waitForRender();
        let rect = element.getBoundingClientRect();
        expect(rect.x).toBeCloseTo(25);
        expect(rect.y).toBeCloseTo(25);

        await simulateResize(handleIds.topLeft["data-testid"], -60, -60);
        await waitForRender();
        rect = element.getBoundingClientRect();
        expect(rect.width).toBeCloseTo(125);
        expect(rect.height).toBeCloseTo(125);
        expect(rect.x).toBeCloseTo(0);
        expect(rect.y).toBeCloseTo(0);
    });

    it('should respect boundary "parent" during resizing', async () => {
        const textContent = "Resize Parent Boundary";
        const parentId = "parent-boundary";
        const handleIds = createHandleIds(textContent);
        const { getByText } = render(() => (
            <div
                id={parentId}
                style={{
                    position: 'absolute',
                    top: '50px',
                    left: '50px',
                    width: '300px',
                    height: '300px',
                    background: 'black',
                }}
            >
                <DragAndResize
                    initialState={{ x: 25, y: 25, width: 100, height: 100 }}
                    resizeHandleProps={handleIds}
                    boundary="parent"
                >
                    {textContent}
                </DragAndResize>
            </div>
        ));

        await waitForRender();
        const element = getByText(textContent);
        let rect = element.getBoundingClientRect();
        expect(rect.width).toBeCloseTo(100);
        expect(rect.height).toBeCloseTo(100);
        expect(rect.x).toBeCloseTo(75);
        expect(rect.y).toBeCloseTo(75);

        await simulateResize(handleIds.topLeft["data-testid"], -50, -50);
        await waitForRender();
        rect = element.getBoundingClientRect();
        expect(rect.width).toBeCloseTo(125);
        expect(rect.height).toBeCloseTo(125);
        expect(rect.x).toBeCloseTo(50);
        expect(rect.y).toBeCloseTo(50);
    });
});
/*
describe("additional props", () => {
    it("supports dragHandle as HTMLElement array", async () => {
        const textContent = "drag handle test";
        const handle = document.createElement("div");
        handle.className = "handle";
        document.body.appendChild(handle);

        render(() => (
            <DragAndResize dragHandle={[handle]}>
                <div ref={el => el && el.appendChild(handle)}>wrapper</div>
                {textContent}
            </DragAndResize>
        ));

        await waitForRender();

        const el = screen.getByText(textContent).parentElement!;
        expect(el).toBeVisible();

        const { dx } = await simulateDrag(el, 50, 0, { handleSelector: ".handle" });
        expect(dx).toBeGreaterThan(0);
    });

    it("respects resizeAxes by creating only allowed handles", async () => {
        const textContent = "resize axes test";
        render(
            <DragAndResize resizeAxes={{ n: true, e: false, s: true, w: false }}>
                {textContent}
            </DragAndResize>
        );

        await waitForRender();

        const el = screen.getByText(textContent).parentElement!;
        expect(el.querySelector("[data-dir='n']")).toBeTruthy();
        expect(el.querySelector("[data-dir='s']")).toBeTruthy();
        expect(el.querySelector("[data-dir='e']")).toBeFalsy();
        expect(el.querySelector("[data-dir='w']")).toBeFalsy();
    });

    it("applies resizeHandleProps per direction", async () => {
        const textContent = "resize handle props test";
        render(
            <DragAndResize
                resizeAxes={{ e: true, w: true }}
                resizeHandleProps={{
                    e: { id: "east-handle" },
                    w: { id: "west-handle" }
                }}
            >
                {textContent}
            </DragAndResize>
        );

        await waitForRender();

        const el = screen.getByText(textContent).parentElement!;
        expect(el.querySelector("#east-handle")).toBeTruthy();
        expect(el.querySelector("#west-handle")).toBeTruthy();
    });

    it("supports customResizeHandles and omits default handles for those directions", async () => {
        const textContent = "custom handles test";
        render(
            <DragAndResize
                resizeAxes={{ e: true }}
                customResizeHandles={{
                    e: <div data-testid="custom-east" />
                }}
            >
                {textContent}
            </DragAndResize>
        );

        await waitForRender();

        const el = screen.getByText(textContent).parentElement!;
        expect(el.querySelector("[data-testid='custom-east']")).toBeTruthy();
        expect(el.querySelector("[data-dir='e']")).toBeFalsy();
    });

    it("keeps element within functional boundary and calls onEnsureInside", async () => {
        const textContent = "ensure inside test";
        const boundaryRect = { left: 0, top: 0, right: 300, bottom: 300 };
        const onEnsureInside = vi.fn();

        render(
            <DragAndResize
                boundary={() => boundaryRect}
                ensureInside
                onEnsureInside={onEnsureInside}
            >
                {textContent}
            </DragAndResize>
        );

        await waitForRender();

        const el = screen.getByText(textContent).parentElement!;
        await simulateDrag(el, 1000, 1000);
        expect(onEnsureInside).toHaveBeenCalled();
    });

    it("keeps element within HTMLElement boundary", async () => {
        const textContent = "element boundary test";
        let boundaryEl: HTMLDivElement;

        render(
            <>
                <div
                    ref={el => {
                        if (el) boundaryEl = el;
                    }}
                    style={{
                        position: "absolute",
                        left: "0px",
                        top: "0px",
                        width: "200px",
                        height: "200px"
                    }}
                    data-testid="boundary"
                />
                <DragAndResize boundary={() => boundaryEl!} ensureInside>
                    {textContent}
                </DragAndResize>
            </>
        );

        await waitForRender();

        const el = screen.getByText(textContent).parentElement!;
        await simulateDrag(el, 500, 500);
        const boundaryBox = boundaryEl!.getBoundingClientRect();
        const targetBox = el.getBoundingClientRect();
        expect(targetBox.right).toBeLessThanOrEqual(boundaryBox.right);
        expect(targetBox.bottom).toBeLessThanOrEqual(boundaryBox.bottom);
    });
});


// Drag handle configuration
// Boundaries with changing boundaries & ensureInside
// Smoke

/*
describe('Resize Handle Configuration', async () => {
    it.skip('should only render resize handles specified by resizeAxes', async () => {
        const textContent = "Resize Axes Test";
        const handleIds = createHandleIds(textContent);
        const { getByText } = render(() => (
            <DragAndResize
                initialState={{ x: 0, y: 0, width: 100, height: 100 }}
                resizeHandleProps={handleIds}
                resizeAxes={{
                    top: true,
                    right: true,
                    bottom: true,
                    left: false,
                    topRight: false,
                    bottomRight: true,
                    topLeft: false,
                    bottomLeft: false,
                }}
            >
                {textContent}
            </DragAndResize>
        ));
        const element = getByText(textContent) as HTMLElement;
        await waitForRender();

        // Check for handles that should exist
        expect(element.querySelector('[data-resize-handle-top]')).toBeInTheDocument();
        expect(element.querySelector('[data-resize-handle-right]')).toBeInTheDocument();
        expect(element.querySelector('[data-resize-handle-bottom]')).toBeInTheDocument();
        expect(element.querySelector('[data-resize-handle-bottomRight]')).toBeInTheDocument();

        // Check for handles that should NOT exist
        expect(element.querySelector('[data-resize-handle-left]')).not.toBeInTheDocument();
        expect(element.querySelector('[data-resize-handle-topRight]')).not.toBeInTheDocument();
        expect(element.querySelector('[data-resize-handle-topLeft]')).not.toBeInTheDocument();
        expect(element.querySelector('[data-resize-handle-bottomLeft]')).not.toBeInTheDocument();

        // Verify that a disabled handle does not resize
        const initialRect = element.getBoundingClientRect();
        // Attempt to resize using the left handle (which should be missing or inactive)
        await commands.mouseFind(element.textContent || ""); // Just to get a starting point for mouse
        await commands.mouseDown(); // Will not click on a handle, so no resize should start
        const elRect = element.getBoundingClientRect();
        const elCenterX = elRect.left + elRect.width / 2;
        const elCenterY = elRect.top + elRect.height / 2;
        await commands.mouseMove(elCenterX - 50, elCenterY); // Simulate dragging left edge
        await commands.mouseUp();
        await waitForRender();

        const finalRect = element.getBoundingClientRect();
        expect(finalRect.width).toBeCloseTo(initialRect.width); // Width should not change
        expect(finalRect.x).toBeCloseTo(initialRect.x); // Position should not change
    });

    it.skip('should apply custom props to all resize handles using "all"', async () => {
        const testClass = "all-handle-class";
        const customAttribute = "data-custom-attr";
        const customValue = "some-value";
        const { getByText } = render(() => (
            <DragAndResize
                initialState={{ x: 0, y: 0, width: 100, height: 100 }}
                resizeHandleProps={{
                    all: {
                        class: testClass,
                        [customAttribute]: customValue,
                    },
                }}
            >
                Test All Handles
            </DragAndResize>
        ));
        const element = getByText("Test All Handles") as HTMLElement;
        await waitForRender();

        // Use the `directions` array to iterate and check all handles
        directions.forEach(direction => {
            const handle = element.querySelector(`[data-resize-handle-${direction}]`);
            expect(handle).toBeInTheDocument();
            expect(handle).toHaveClass(testClass);
            expect(handle?.getAttribute(customAttribute)).toBe(customValue);
        });
    });

    it.skip('should apply specific props to individual resize handles and common props via "all"', async () => {
        const commonClass = "common-handle-class";
        const trClass = "topRight-specific-class";
        const leftContent = "Left Handle Content";
        const { getByText } = render(() => (
            <DragAndResize
                initialState={{ x: 0, y: 0, width: 100, height: 100 }}
                resizeHandleProps={{
                    all: {
                        class: commonClass,
                        "data-common": "true",
                    },
                    topRight: { // Use string literal "topRight"
                        class: trClass, // This should override commonClass if applied directly
                        "data-tr-specific": "true",
                        children: <span class="custom-child">TR!</span>
                    },
                    left: { // Use string literal "left"
                        children: <span class="custom-child">{leftContent}</span>
                    }
                }}
            >
                Test Specific Handles
            </DragAndResize>
        ));
        const element = getByText("Test Specific Handles") as HTMLElement;
        await waitForRender();

        // Test "topRight" handle
        const trHandle = element.querySelector('[data-resize-handle-topRight]'); // Use "topRight"
        expect(trHandle).toBeInTheDocument();
        expect(trHandle).toHaveClass(trClass); // Specific class takes precedence
        expect(trHandle).not.toHaveClass(commonClass); // Common class should not be applied if specific class exists for a prop
        expect(trHandle?.getAttribute('data-common')).toBe("true"); // Common attribute should still apply
        expect(trHandle?.getAttribute('data-tr-specific')).toBe("true");
        expect(trHandle?.querySelector('.custom-child')?.textContent).toBe("TR!");


        // Test "left" handle
        const leftHandle = element.querySelector('[data-resize-handle-left]'); // Use "left"
        expect(leftHandle).toBeInTheDocument();
        expect(leftHandle).toHaveClass(commonClass); // Common class should apply
        expect(leftHandle?.getAttribute('data-common')).toBe("true");
        expect(leftHandle?.querySelector('.custom-child')?.textContent).toBe(leftContent);


        // Test a handle not specifically defined (e.g., "bottom")
        const bottomHandle = element.querySelector('[data-resize-handle-bottom]'); // Use "bottom"
        expect(bottomHandle).toBeInTheDocument();
        expect(bottomHandle).toHaveClass(commonClass);
        expect(bottomHandle?.getAttribute('data-common')).toBe("true");
        expect(bottomHandle?.children.length).toBe(0); // No children if not specified
    });

    it.skip('should use custom HTML elements for resize handles', async () => {
        const textContent = "Custom Resize Handles";
        const topCustomHandle = document.createElement('div');
        topCustomHandle.className = 'my-top-handle';
        topCustomHandle.textContent = 'T-Handle';

        const brCustomHandle = document.createElement('div');
        brCustomHandle.className = 'my-br-handle';
        brCustomHandle.textContent = 'BR-Handle';

        const { getByText } = render(() => (
            <DragAndResize
                initialState={{ x: 0, y: 0, width: 100, height: 100 }}
                customResizeHandles={[
                    { direction: "top", element: topCustomHandle }, // Use "top"
                    { direction: "bottomRight", element: brCustomHandle }, // Use "bottomRight"
                ]}
            >
                {textContent}
            </DragAndResize>
        ));
        const element = getByText(textContent) as HTMLElement;
        await waitForRender();

        // Check if custom handles are present and correctly attached
        const topHandle = element.querySelector('.my-top-handle');
        expect(topHandle).toBeInTheDocument();
        expect(topHandle?.textContent).toBe('T-Handle');
        expect(element.querySelector('[data-resize-handle-top]')).toBeNull(); // Default should not be there

        const brHandle = element.querySelector('.my-br-handle');
        expect(brHandle).toBeInTheDocument();
        expect(brHandle?.textContent).toBe('BR-Handle');
        expect(element.querySelector('[data-resize-handle-bottomRight]')).toBeNull(); // Default should not be there

        // Check if default handles for unspecified directions are still present
        expect(element.querySelector('[data-resize-handle-right]')).toBeInTheDocument();
        expect(element.querySelector('[data-resize-handle-left]')).toBeInTheDocument();

        // Verify that the custom handle actually resizes
        const initialRect = element.getBoundingClientRect();
        expect(initialRect.width).toBeCloseTo(100);
        expect(initialRect.height).toBeCloseTo(100);

        // Simulate resize using the custom "bottomRight" handle
        // We'll rely on the textContent for mouseFind, but if it's dynamic, use more robust locator.
        await commands.mouseFind(brCustomHandle.textContent || "");
        await commands.mouseDown();
        const elRect = element.getBoundingClientRect();
        const elCenterX = elRect.left + elRect.width / 2;
        const elCenterY = elRect.top + elRect.height / 2;
        await commands.mouseMove(elCenterX + 50, elCenterY + 50); // Move by 50,50 relative to element center
        await commands.mouseUp();
        await waitForRender();

        const finalRect = element.getBoundingClientRect();
        expect(finalRect.width).toBeCloseTo(150);
        expect(finalRect.height).toBeCloseTo(150);

        // Simulate resize using the custom "top" handle
        // Adjust element position so it doesn't hit top of window
        await page.evaluate((el: HTMLElement) => {
            el.style.left = '50px';
            el.style.top = '50px';
            el.style.width = '100px';
            el.style.height = '100px';
        }, element);
        await waitForRender();

        const preTopResizeRect = element.getBoundingClientRect();

        await commands.mouseFind(topCustomHandle.textContent || "");
        await commands.mouseDown();
        await commands.mouseMove(elCenterX, elCenterY - 50); // Move mouse up 50px relative to element center
        await commands.mouseUp();
        await waitForRender();

        const postTopResizeRect = element.getBoundingClientRect();
        expect(postTopResizeRect.height).toBeCloseTo(preTopResizeRect.height + 50); // Height increases
        expect(postTopResizeRect.y).toBeCloseTo(preTopResizeRect.y - 50); // Y position moves up
        expect(postTopResizeRect.width).toBeCloseTo(preTopResizeRect.width); // Width stays same
        expect(postTopResizeRect.x).toBeCloseTo(preTopResizeRect.x); // X position stays same
    });

});
*/
