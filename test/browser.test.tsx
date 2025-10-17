import { createSignal, JSX } from 'solid-js'
import { isServer } from 'solid-js/web'
import { render, cleanup } from '@solidjs/testing-library'

import { describe, expect, it, beforeAll, afterEach, afterAll, vi } from 'vitest'
import { page,  commands } from '@vitest/browser/context'

import { DragAndResize, type State, type Bounds } from '../src'
import { type Direction } from '../src/resize'

// Don't make the default delay any smaller
const waitForRender = async (delay=10) =>
    await new Promise(resolve =>
        setTimeout(resolve, delay));

const simulateDrag = async (
    element: HTMLElement,
    x: number,
    y: number,
) => {
    if (!element.textContent) throw new Error("Tried dragging element without locator")
    await commands.mouseFind("byText", element.textContent);
    await commands.mouseDown();
    await commands.mouseMove("byText", element.textContent, x, y);
    await commands.mouseUp();

    /*
    const common = {
        pointerId: 1,
        width: 5,
        height: 5,
        pointerType: 'mouse',
        bubbles: true,
        cancelable: true,
    }
    const rect = element.getBoundingClientRect()
    const event1 = new PointerEvent("pointerdown", {
        ...common,
        clientX: rect.x,
        clientY: rect.y,
    });
    element.dispatchEvent(event1);
    await waitForRender();

    const event2 = new PointerEvent("pointermove", {
        ...common,
        clientX: rect.x + x/2,
        clientY: rect.y + y/2,
e   });
    element.dispatchEvent(event2);
    await waitForRender();

    const event3 = new PointerEvent("pointermove", {
        ...common,
        clientX: rect.x + x,
        clientY: rect.y + y,
    });
    element.dispatchEvent(event3);
    await waitForRender();

    const event4 = new PointerEvent("pointerup", {
        ...common,
        clientX: rect.x + x,
        clientY: rect.y + y,
    });
    element.dispatchEvent(event4);
    await waitForRender();
    */
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

    /*
    const element = document.querySelector(`[data-testid="${elementTestId}"]`);
    if (!element) throw new Error("Resize element not found");
    const rect = element.getBoundingClientRect()
    const event1 = new PointerEvent("pointerdown", {
        pointerId: 1,
        width: 5,
        height: 5,
        pointerType: 'mouse',
        isPrimary: true,
        clientX: rect.x,
        clientY: rect.y,
        bubbles: true,
        cancelable: true,
    });
    element.dispatchEvent(event1);
    await waitForRender();

    const event2 = new PointerEvent("pointermove", {
        pointerId: 1,
        width: 5,
        height: 5,
        pointerType: 'mouse',
        isPrimary: true,
        clientX: rect.x + x,
        clientY: rect.y + y,
        bubbles: true,
        cancelable: true,
    });
    element.dispatchEvent(event2);
    await waitForRender();

    const event3 = new PointerEvent("pointermove", {
        pointerId: 1,
        width: 5,
        height: 5,
        pointerType: 'mouse',
        isPrimary: true,
        clientX: x,
        clientY: y,
        bubbles: true,
        cancelable: true,
    });
    element.dispatchEvent(event3);
    await waitForRender();
    */
};

let initialSize: {
    width: number,
    height: number,
};

//const allTests: Element[] = [];

beforeAll(async () => {
    initialSize = {
        width: window.outerWidth,
        height: window.innerHeight,
    };
    await commands.resizeViewport(1920, 1080);
});

afterEach(() => {
    cleanup();
//    for (const child of document.body.children) {
//        /*
//        const el = child as HTMLElement;
//        el.style.display = "none";
//        */
//        document.body.removeChild(child);
//        allTests.push(child)
//    }
});

afterAll(() => {
//    /*
//    for (const child of document.body.children) {
//        const el = child as HTMLElement;
//        el.style.display = "block";
//    }
//    */
//    allTests.forEach((child) => {
//        document.body.appendChild(child);
//    });
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

describe.shuffle('Drag functionality', () => {
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
        expect(initialRect.x).toBeCloseTo(0, 1);
        expect(initialRect.y).toBeCloseTo(0, 1);

        await simulateDrag(element, 50, 50);
        await waitForRender();

        const finalRect = element.getBoundingClientRect();
        expect(finalRect.x).toBeCloseTo(50, 1);
        expect(finalRect.y).toBeCloseTo(50, 1);
    });

    it('should drag using the specified handle (string selector)', async () => {
        const { getByText } = render(() => (
            <DragAndResize initialState={{ x: 0, y: 0, width: 100, height: 100 }} dragHandle=".handle">
                <div
                    class="handle"
                >Drag Handle</div>
                <div>Content</div>
            </DragAndResize>
        ));

        const handle = getByText("Drag Handle");
        const element = handle.parentElement!;

        await new Promise(resolve => setTimeout(resolve, 0));

        let rect = element.getBoundingClientRect();
        expect(rect.left).toBeCloseTo(0, 1);
        expect(rect.top).toBeCloseTo(0, 1);

        // Attempt to drag the component itself (should not work)
        await simulateDrag(element, 50, 50);
        rect = element.getBoundingClientRect();
        expect(rect.left).toBeCloseTo(0, 1);
        expect(rect.top).toBeCloseTo(0, 1);

        // Drag using the handle
        await simulateDrag(handle, 50, 50);
        rect = element.getBoundingClientRect();
        expect(rect.left).toBeCloseTo(50, 1);
        expect(rect.top).toBeCloseTo(50, 1);
    });

    it('should drag using the specified handle (element reference)', async () => {
        const { getByText } = render(() => (
            <DragAndResize initialState={{ x: 0, y: 0, width: 100, height: 100 }} dragHandle={document.querySelector(".handle")!}>
                <div
                    class="handle"
                >Drag Handle</div>
                <div>Content</div>
            </DragAndResize>
        ));

        const handle = getByText("Drag Handle");
        const element = handle.parentElement!;

        await new Promise(resolve => setTimeout(resolve, 0));

        let rect = element.getBoundingClientRect();
        expect(rect.left).toBeCloseTo(0, 1);
        expect(rect.top).toBeCloseTo(0, 1);

        // Attempt to drag the component itself (should not work)
        await simulateDrag(element, 50, 50);
        rect = element.getBoundingClientRect();
        expect(rect.left).toBeCloseTo(0, 1);
        expect(rect.top).toBeCloseTo(0, 1);

        // Drag using the handle
        await simulateDrag(handle, 50, 50);
        rect = element.getBoundingClientRect();
        expect(rect.left).toBeCloseTo(50, 1);
        expect(rect.top).toBeCloseTo(50, 1);
    });

    it('should drag using the specified handles (array of selectors and elements)', async () => {
        const { getByText } = render(() => (
            <DragAndResize
                initialState={{ x: 0, y: 0, width: 100, height: 100 }}
                dragHandle={[".handle", document.querySelector(".handle2")!]}
            >
                <span class="handle" >Handle1</span>
                <span class="handle2" >Handle2</span>
                <div>Content</div>
            </DragAndResize>
        ));

        const handle1 = getByText("Handle1");
        const handle2 = getByText("Handle2");
        const element = handle1.parentElement!;

        await new Promise(resolve => setTimeout(resolve, 0));

        let rect = element.getBoundingClientRect();
        expect(rect.left).toBeCloseTo(0, 1);
        expect(rect.top).toBeCloseTo(0, 1);

        // Attempt to drag the component itself (should not work)
        await simulateDrag(element, 50, 50);
        rect = element.getBoundingClientRect();
        expect(rect.left).toBeCloseTo(0, 1);
        expect(rect.top).toBeCloseTo(0, 1);

        // Drag using first handle
        await simulateDrag(handle1, 50, 50);
        await waitForRender();
        rect = element.getBoundingClientRect();
        expect(rect.left).toBeCloseTo(50, 1);
        expect(rect.top).toBeCloseTo(50, 1);

        // Drag using second handle
        await simulateDrag(handle2, -25, -25);
        await waitForRender();
        rect = element.getBoundingClientRect();
        expect(rect.left).toBeCloseTo(25, 1);
        expect(rect.top).toBeCloseTo(25, 1);
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
        await waitForRender(200);
        expect(element).toHaveClass(testClass);

        await commands.mouseMove("byText", textContent, 50, 50);
        await waitForRender(200);
        expect(element).toHaveClass(testClass);

        await commands.mouseUp();
        await waitForRender(200);
        expect(element).not.toHaveClass(testClass);
    });

    it('should call dragStart, drag, and dragEnd callbacks', async () => {
        const dragStartMock = vi.fn();
        const dragMock = vi.fn();
        const dragEndMock = vi.fn();

        const textContent = "Dragging Callbacks"
        render(() => (
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
        expect(rect.left).toBeCloseTo(0, 1);
        expect(rect.top).toBeCloseTo(0, 1);

        await commands.mouseFind("byText", textContent);
        await commands.mouseDown();
        await waitForRender();
        rect = element.getBoundingClientRect();
        expect(rect.left).toBeCloseTo(50, 1);
        expect(rect.top).toBeCloseTo(50, 1);
        await commands.mouseUp();
    });

    it('should allow drag to return new state', async () => {
        const textContent = "drag callback test"
        const { getByText } = render(() => (
            <DragAndResize
                initialState={{ x: 0, y: 0, width: 100, height: 100 }}
                drag={(_event, _offset, _state) => {
                    return { x: 50, y: 50, width: 100, height: 100 }
                }}
            >
                {textContent}
            </DragAndResize>
        ));
        await waitForRender();
        const element = getByText(textContent) as HTMLElement;

        let rect = element.getBoundingClientRect();
        expect(rect.left).toBeCloseTo(0, 1);
        expect(rect.top).toBeCloseTo(0, 1);

        await commands.mouseFind("byText", textContent);
        await commands.mouseDown();
        await commands.mouseMove("byText", textContent, 20, 20);
        await waitForRender();
        rect = element.getBoundingClientRect();
        expect(rect.left).toBeCloseTo(50, 1);
        expect(rect.top).toBeCloseTo(50, 1);
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
        expect(rect.left).toBeCloseTo(0, 1);
        expect(rect.top).toBeCloseTo(0, 1);

        await commands.mouseFind("byText", textContent);
        await commands.mouseDown();
        await commands.mouseMove("byText", textContent, 50, 50);
        await waitForRender()
        rect = element.getBoundingClientRect();
        expect(rect.left).toBeCloseTo(50, 1);
        expect(rect.top).toBeCloseTo(50, 1);

        await commands.mouseUp();
        await waitForRender()
        rect = element.getBoundingClientRect();
        expect(rect.left).toBeCloseTo(100, 1);
        expect(rect.top).toBeCloseTo(100, 1);
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
        expect(rect.x).toBeCloseTo(0, 1);
        expect(rect.y).toBeCloseTo(0, 1);

        await simulateDrag(element, -20, -20);
        await waitForRender();
        rect = element.getBoundingClientRect();
        expect(rect.x).toBeCloseTo(-20, 1);
        expect(rect.y).toBeCloseTo(-20, 1);
    });

    it('should respect boundaries "window" during drag', async () => {
        const textContent = "Window-Bounded-Drag"
        const { getByText } = render(() => (
            <DragAndResize
                initialState={{ x: 0, y: 0, width: 100, height: 100 }}
                boundary="window"
            >
                {textContent}
            </DragAndResize>
        ));

        await waitForRender();
        const element = getByText(textContent);
        let rect = element.getBoundingClientRect()

        await simulateDrag(element, 50, 50);
        await waitForRender();
        rect = element.getBoundingClientRect();
        expect(rect.x).toBeCloseTo(50, 1);
        expect(rect.y).toBeCloseTo(50, 1);

        // Drag far left and up
        await simulateDrag(element, -1000, -1000);
        await waitForRender();
        rect = element.getBoundingClientRect()
        expect(rect.x).toBeCloseTo(0, 1);
        expect(rect.y).toBeCloseTo(0, 1);
    });

    it('should respect boundaries "parent" during drag', async () => {
        const textContent = "Bounded Parent Drag";
        const { getByText } = render(() => (
            <div style="width: 300px; height: 300px; margin: 10px; padding: 10px;">
                <DragAndResize
                    initialState={{ x: 0, y: 0, width: 50, height: 50 }}
                    boundary="parent"
                >
                    {textContent}
                </DragAndResize>
            </div>
        ));
        await waitForRender();
        const element = getByText(textContent);

        let rect = element.getBoundingClientRect();
        let parentRect = element.parentElement?.getBoundingClientRect();
        if (!parentRect) throw new Error("Something weird");
        // 10 margin + 10 padding = 20 relative to viewport
        expect(rect.top).toBeCloseTo(20, 1);
        expect(rect.left).toBeCloseTo(20, 1);

        // Test dragging past top left
        await simulateDrag(element, -50, -50);
        await waitForRender();
        rect = element.getBoundingClientRect()
        expect(rect.x).toBeCloseTo(10, 1);
        expect(rect.y).toBeCloseTo(10, 1);

        // Test dragging past bottom right
        await simulateDrag(element, 400, 400);
        await waitForRender();
        rect = element.getBoundingClientRect()
        expect(rect.top).toBeCloseTo(parentRect.height + 10 - rect.height, 1);
        expect(rect.left).toBeCloseTo(parentRect.width + 10 - rect.width, 1);
    });

    it('should respect element reference boundaries during drag', async () => {
        const textContent = "Bounded Parent Drag";
        let boundary!: HTMLDivElement;
        const { getByText } = render(() => (
            <div ref={boundary} style="width: 300px; height: 300px; margin: 10px; padding: 10px;">
                <DragAndResize
                    initialState={{ x: 0, y: 0, width: 50, height: 50 }}
                    boundary={boundary}
                >
                    {textContent}
                </DragAndResize>
            </div>
        ));
        await waitForRender();
        const element = getByText(textContent);

        let rect = element.getBoundingClientRect();
        let parentRect = element.parentElement?.getBoundingClientRect();
        if (!parentRect) throw new Error("Something weird");
        // 10 margin + 10 padding = 20 relative to viewport
        expect(rect.top).toBeCloseTo(20, 1);
        expect(rect.left).toBeCloseTo(20, 1);

        // Test dragging past top left
        await simulateDrag(element, -50, -50);
        await waitForRender();
        rect = element.getBoundingClientRect()
        expect(rect.x).toBeCloseTo(10, 1);
        expect(rect.y).toBeCloseTo(10, 1);

        // Test dragging past bottom right
        await simulateDrag(element, 400, 400);
        await waitForRender();
        rect = element.getBoundingClientRect()
        expect(rect.top).toBeCloseTo(parentRect.height + 10 - rect.height, 1);
        expect(rect.left).toBeCloseTo(parentRect.width + 10 - rect.width, 1);
    });

    it('should respect custom boundaries during drag', async () => {
        const customBounds: Bounds = { top: 10, right: 10, bottom: 10, left: 10 };

        const { getByText } = render(() => (
            <DragAndResize
                initialState={{ x: 20, y: 20, width: 100, height: 100 }}
                boundary={customBounds}
            >
                Custom Bounded Drag
            </DragAndResize>
        ));

        await waitForRender();
        const element = getByText("Custom Bounded Drag");

        let rect = element.getBoundingClientRect();
        expect(rect.top).toBeCloseTo(20, 1);
        expect(rect.left).toBeCloseTo(20, 1);

        // Too flaky to simulate drag past right/bottom boundary

        // Simulate drag past left/top boundary
        await simulateDrag(element, -1000, -1000);
        await waitForRender();
        rect = element.getBoundingClientRect()
        expect(rect.top).toBeCloseTo(10, 1);
        expect(rect.left).toBeCloseTo(10, 1);
    });

    it('should respect custom boundaries as a function during drag', async () => {
        const customBounds: Bounds = { top: 10, right: 10, bottom: 10, left: 10 };

        const { getByText } = render(() => (
            <DragAndResize
                initialState={{ x: 20, y: 20, width: 100, height: 100 }}
                boundary={() => customBounds}
            >
                Custom Bounded Drag
            </DragAndResize>
        ));

        await waitForRender();
        const element = getByText("Custom Bounded Drag");

        let rect = element.getBoundingClientRect();
        expect(rect.top).toBeCloseTo(20, 1);
        expect(rect.left).toBeCloseTo(20, 1);

        // Too flaky to simulate drag past right/bottom boundary

        // Simulate drag past left/top boundary
        await simulateDrag(element, -1000, -1000);
        await waitForRender();
        rect = element.getBoundingClientRect()
        expect(rect.top).toBeCloseTo(10, 1);
        expect(rect.left).toBeCloseTo(10, 1);
    });
});

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

describe.shuffle('Resize functionality', async () => {

    it('should resize the component from the "bottomRight" handle', async () => {
        await waitForRender(100);
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

        await waitForRender();
        const element = getByText(textContent);

        const initialRect = element.getBoundingClientRect();
        expect(initialRect.width).toBeCloseTo(100, 1);
        expect(initialRect.height).toBeCloseTo(100, 1);

        await simulateResize(handleIds.bottomRight['data-testid'], 50, 50);
        await waitForRender(100);

        const finalRect = element.getBoundingClientRect();
        expect(finalRect.width).toBeCloseTo(150, 1);
        expect(finalRect.height).toBeCloseTo(150, 1);
        expect(finalRect.x).toBeCloseTo(initialRect.x, 1);
        expect(finalRect.y).toBeCloseTo(initialRect.y, 1);
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
        expect(rect.width).toBeCloseTo(100, 1);
        expect(rect.height).toBeCloseTo(100, 1);

        await simulateResize(handleIds.bottomRight["data-testid"], -50, -50);
        await waitForRender();

        rect = element.getBoundingClientRect();
        expect(rect.width).toBeCloseTo(75, 1);
        expect(rect.height).toBeCloseTo(75, 1);

        await simulateResize(handleIds.topLeft["data-testid"], 50, 50);
        await waitForRender();

        rect = element.getBoundingClientRect();
        expect(rect.width).toBeCloseTo(75, 1);
        expect(rect.height).toBeCloseTo(75, 1);
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
        expect(rect.width).toBeCloseTo(100, 1);
        expect(rect.height).toBeCloseTo(100, 1);

        await simulateResize(handleIds.bottomRight["data-testid"], 100, 100);
        await waitForRender(100);

        rect = element.getBoundingClientRect();
        expect(rect.width).toBeCloseTo(150, 1);
        expect(rect.height).toBeCloseTo(150, 1);

        await simulateResize(handleIds.topLeft["data-testid"], -50, -50);
        await waitForRender(100);

        rect = element.getBoundingClientRect();
        expect(rect.width).toBeCloseTo(150, 1);
        expect(rect.height).toBeCloseTo(150, 1);
    });

    it('should call resizeStart, resize, and resizeEnd callbacks', async () => {
        const resizeStartMock = vi.fn();
        const resizeMock = vi.fn();
        const resizeEndMock = vi.fn();

        const textContent = "Resizing-Callbacks"
        const handleIds = createHandleIds(textContent);
        render(() => (
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
        expect(rect.width).toBeCloseTo(100, 1);
        expect(rect.height).toBeCloseTo(100, 1);
        expect(rect.x).toBeCloseTo(0, 1);
        expect(rect.y).toBeCloseTo(0, 1);

        await simulateResize(handleIds.bottomRight["data-testid"], 50, 50);
        await waitForRender();

        rect = element.getBoundingClientRect();
        expect(rect.width).toBeCloseTo(100, 1);
        expect(rect.height).toBeCloseTo(100, 1);

        // The resize will become a drag b/c of event bubbling
        expect(rect.x).toBeCloseTo(50, 1);
        expect(rect.y).toBeCloseTo(50, 1);

        // Check if drag still works (since drag is true)
        await simulateDrag(element, 50, 50);
        await waitForRender();
        rect = element.getBoundingClientRect();
        expect(rect.x).toBeCloseTo(100, 1);
        expect(rect.y).toBeCloseTo(100, 1);
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
        expect(rect.width).toBeCloseTo(100, 1);
        expect(rect.height).toBeCloseTo(100, 1);

        await simulateResize(handleIds.bottomRight["data-testid"], 50, 50);
        await waitForRender();
        rect = element.getBoundingClientRect();
        expect(rect.width).toBeCloseTo(100, 1);
        expect(rect.height).toBeCloseTo(100, 1);

        await simulateDrag(element, 50, 50);
        await waitForRender();
        rect = element.getBoundingClientRect();
        expect(rect.x).toBeCloseTo(0, 1);
        expect(rect.y).toBeCloseTo(0, 1);
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
        expect(rect.width).toBeCloseTo(100, 1);
        expect(rect.height).toBeCloseTo(100, 1);

        await simulateResize(handleIds.bottomRight["data-testid"], parentRect.width, parentRect.height);
        rect = element.getBoundingClientRect();
        expect(rect.width).toBeGreaterThan(parentRect.width);
        expect(rect.height).toBeGreaterThan(parentRect.height);
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
        expect(rect.x).toBeCloseTo(25, 1);
        expect(rect.y).toBeCloseTo(25, 1);

        await simulateResize(handleIds.topLeft["data-testid"], -60, -60);
        await waitForRender();
        rect = element.getBoundingClientRect();
        expect(rect.width).toBeCloseTo(125, 1);
        expect(rect.height).toBeCloseTo(125, 1);
        expect(rect.x).toBeCloseTo(0, 1);
        expect(rect.y).toBeCloseTo(0, 1);
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
        expect(rect.width).toBeCloseTo(100, 1);
        expect(rect.height).toBeCloseTo(100, 1);
        expect(rect.x).toBeCloseTo(75, 1);
        expect(rect.y).toBeCloseTo(75, 1);

        await simulateResize(handleIds.topLeft["data-testid"], -50, -50);
        await waitForRender();
        rect = element.getBoundingClientRect();
        expect(rect.width).toBeCloseTo(125, 1);
        expect(rect.height).toBeCloseTo(125, 1);
        expect(rect.x).toBeCloseTo(50, 1);
        expect(rect.y).toBeCloseTo(50, 1);
    });

    it('should accept attributes for "all" resizeHandleProps', async () => {
        const textContent = "all-with-resizeHandleProps"
        const { getByText } = render(() => (
            <DragAndResize
                initialState={{ x: 0, y: 0, width: 100, height: 100 }}
                resizeHandleProps={{
                    all: {
                        style: {
                            background: "red",
                        },
                    },
                }}
            >
                {textContent}
            </DragAndResize>
        ));

        await waitForRender();
        const element = getByText(textContent);
        for (const resizeHandle of element.children) {
            const handle = resizeHandle as HTMLElement;
            expect(handle.style.background).toEqual("red");
        }
    });
});

describe("additional props", () => {
    it.skip("supports dragHandle as HTMLElement array", async () => {
        const textContent = "Drag-Handle-Array";
        const dragHandles: (string|HTMLElement)[] = [];
        const handleStyle = {
            "margin-left": "125px",
            "height": "25px",
            "width": "25px",
            "background": "blue",
        } as JSX.CSSProperties;
        const { getByText } = render(() => (
            <DragAndResize
                // @ts-ignore
                dragHandle={[dragHandles]}
                initialState={{ x: 0, y: 0, width: 100, height: 100 }}
            >
                <div id="handle-1" style={handleStyle}>Handle1</div>
                <div id="handle-2" style={handleStyle}>Handle2</div>
                {textContent}
            </DragAndResize>
        ));

        await waitForRender();
        dragHandles.push("#handle-1");
        const handleTwo = document.getElementById("handle-2");
        if (!handleTwo) throw new Error("Something weird");
        dragHandles.push(handleTwo);

        await waitForRender();
        const element = getByText(textContent);
        let rect = element.getBoundingClientRect();
        expect(rect.x).toEqual(0);
        expect(rect.y).toEqual(0);
        expect(rect.width).toEqual(100);
        expect(rect.height).toEqual(100);

        const handleOne = document.getElementById("handle-1");
        if (!handleOne) throw new Error("Something weird");
        await simulateDrag(handleOne, 50, 0);
        await waitForRender();
        await simulateDrag(handleTwo, 0, 50);
        await waitForRender();
        await simulateDrag(element, 50, 50);
        await waitForRender();

        rect = element.getBoundingClientRect();
        expect(rect.x).toEqual(50);
        expect(rect.y).toEqual(50);
        expect(rect.width).toEqual(100);
        expect(rect.height).toEqual(100);

        dragHandles.pop(); // Drag handle two should no longer work
        await simulateDrag(handleTwo, -50, -50);
        await waitForRender();

        rect = element.getBoundingClientRect();
        expect(rect.x).toEqual(50);
        expect(rect.y).toEqual(50);
        expect(rect.width).toEqual(100);
        expect(rect.height).toEqual(100);
    });

    it("applies resizeHandleProps for resizeAxes per direction", async () => {
        const textContent = "resize handle props test";
        const { getByText} = render(() => (
            <DragAndResize
                resizeAxes={{
                    right: true,
                    bottom: true,
                }}
                resizeHandleProps={{
                    top: {},
                    right: { id: "east-handle" },
                    bottom: { id: "west-handle" },
                    left: {},
                    topRight: {},
                    bottomRight: {},
                    bottomLeft: {},
                    topLeft: {},
                }}
            >
                {textContent}
            </DragAndResize>
        ));

        await waitForRender();
        const el = getByText(textContent);
        expect(el.querySelector("#east-handle")).toBeTruthy();
        expect(el.querySelector("#west-handle")).toBeTruthy();
        expect(el.children.length).toEqual(2);
    });

    it("should resize with customResizeHandles", async () => {
        const textContent = "custom handles test";
        const { getByText} = render(() => (
            <DragAndResize
                style={{
                    position: "relative",
                }}
                customResizeHandles={[
                    {
                        direction: "right",
                        element: document.getElementById("custom-handle-right")!,
                    },
                ]}
                initialState={{ x: 0, y: 0, height: 100, width: 100}}
            >
                <div
                    id="custom-handle-right"
                    style={{
                        position: "absolute",
                        right: "-30",
                        width: "30px",
                        height: "30px",
                        background: "blue",
                    }}
                    data-testid="custom-handle-right"
                />
                {textContent}
            </DragAndResize>
        ));

        await waitForRender();
        const element = getByText(textContent);
        let rect = element.getBoundingClientRect()
        expect(rect.x).toEqual(0);
        expect(rect.y).toEqual(0);
        expect(rect.width).toEqual(100);
        expect(rect.height).toEqual(100);

        await waitForRender();
        // The last parameter shouldn't matter since the handle can only move left or right
        await simulateResize("custom-handle-right", 100, 10);
        rect = element.getBoundingClientRect()
        expect(rect.x).toEqual(0);
        expect(rect.y).toEqual(0);
        expect(rect.width).toEqual(200);
        expect(rect.height).toEqual(100);
    });

    it("should call onEnsureInside when boundary resized", async () => {
        const textContent = "Ensure-Inside";
        const parentId = "Ensure-Inside-Parent";
        const onEnsureInside = vi.fn();

        const { getByText} = render(() => (
            <div
                id={parentId}
                style={{ height: "200px", width: "200px", background: "grey" }}
            >
                <DragAndResize
                    boundary={"parent"}
                    ensureInside
                    onEnsureInside={onEnsureInside}
                    initialState={{ x: 75, y: 75, width: 100, height: 100}}
                    enabled={{
                        drag: true,
                        resize: false,
                    }}
                >
                    {textContent}
                </DragAndResize>
            </div>
        ));

        await waitForRender(100);
        const element = getByText(textContent);

        // Fires once on instantiation
        expect(onEnsureInside).toHaveBeenCalledTimes(1);

        let rect = element.getBoundingClientRect();
        expect(rect.x).toEqual(75);
        expect(rect.y).toEqual(75);
        expect(rect.width).toEqual(100);
        expect(rect.height).toEqual(100);

        await simulateDrag(element, 50, 50);
        await waitForRender();
        rect = element.getBoundingClientRect();
        expect(rect.x).toBeCloseTo(100);
        expect(rect.y).toBeCloseTo(100);
        expect(rect.width).toEqual(100);
        expect(rect.height).toEqual(100);

        // Now the parent is resized
        const parent = element.parentElement;
        if (!parent) throw new Error("Something Weird");
        parent.style.width = "150px";
        parent.style.height = "150px";
        expect(parent.style.width).toEqual("150px");
        await waitForRender()

        // Should fire again and move the element back
        expect(onEnsureInside).toHaveBeenCalledTimes(2);
        rect = element.getBoundingClientRect();
        expect(rect.x).toEqual(50);
        expect(rect.y).toEqual(50);
        expect(rect.width).toEqual(100);
        expect(rect.height).toEqual(100);
    });

});

// Drag handle configuration
// Boundaries with changing boundaries & ensureInside
// Smoke

