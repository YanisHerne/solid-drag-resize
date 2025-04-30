import {
    mergeProps,
    ParentComponent,
    ParentProps,
    For,
    createSignal,
    createEffect,
    createMemo,
    onMount,
    onCleanup,
} from "solid-js";
import { createStore} from "solid-js/store"
import {
    directions,
    Direction,
    ResizeCallback,
    ResizeHandle,
} from "./resize";

type RequireAtLeastTwo<T, Keys extends keyof T = keyof T> =
    Pick<T, Exclude<keyof T, Keys>> &
    ({ [K1 in Keys]: Required<Pick<T, K1>> &
        { [K2 in Exclude<Keys, K1>]: Required<Pick<T, K2>> &
            Partial<Pick<T, Exclude<Keys, K1 | K2>>>
        }[Exclude<Keys, K1>]
    }[Keys]);

const clamp = (num: number, min: number, max:number) => {
    return Math.min(Math.max(num, min), max);
}

export type Position = {
    x: number;
    y: number;
}

export type Bounds = {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

const defaultBounds = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
};

type Size = {
    height: number;
    width: number;
}

export type State = Position & Size;

export const defaultState: State = {
    x: 0,
    y: 0,
    height: 100,
    width: 100,
}

const createState = (defaulted: State = defaultState):
[ get: State, (to: RequireAtLeastTwo<State>) => void ] => {
    const [state, setState] = createStore<State>(defaulted);
    const update =(to: RequireAtLeastTwo<State>) => {
        setState(to);
    };
    return [state, update];
}

type ResizeData = {
    offsetY: number;
    offsetX: number;
    init: State & {
        clientY: number;
        clientX: number;
        right: number;
        bottom: number;
    };
    new: State;
};

const defaultResizeData: ResizeData = {
    offsetY: 0,
    offsetX: 0,
    init: {
        y: 0,
        x: 0,
        height: 0,
        width: 0,
        clientY: 0,
        clientX: 0,
        right: 0,
        bottom: 0,
    },
    new: {
        y: 0,
        x: 0,
        height: 0,
        width: 0,
    },
}

export interface Props {
    /**
     * Defaults to true. The component cannot be dragged or resized when this
     * is false. The component's position and size can still be controlled
     * via the `position` and `state` properties.
     */
    enabled?: boolean;
    /**
     * To enable or disable the dragging functionality without
     * changing the resizing functionality.
     */
    dragEnabled?: boolean;
    /**
     * To enable or disable the resizing functionality without
     * changing the dragging functionality.
     */
    resizeEnabled?: boolean;
    /**
     * A forwarded ref to access to the main element of the component.
     */
    ref?: HTMLElement;
    /**
     * Not implemented
     */
    resizeAxes?: {[key in Direction]: boolean};
    /**
     * The size the component starts at before any events fire.
     */
    initialSize?: Size;
    /**
     * The position the component starts at before any events fire.
     */
    initialPosition?: Position;
    /**
     * Changing this prop will directly change the position of the component,
     * though the component's position may be immediately thereafter
     * changed by dragging or resizing events
     */
    position?: Position;
    /**
     * Changing this prop will do a shallow merge of the component's state,
     * that being simply an intersection type of the x and y coordinates
     * with the width and height of the component.
     */
    state?: State;
    /**
     * Resizing will be prevented below this size, though a smaller size
     * may be programmatically set by the `state` prop.
     */
    minSize?: Size;
    /**
     * Resizing will be prevented above this size, though a larger size
     * may be programmatically set by the `state` prop.
     */
    maxSize?: Size;
    /**
     * A variety of ways to describe a drag handle to be used in lieu of
     * the entire element, which is used by default. Events will be bound
     * either directly onto an `HTMLElement` or to one or multiple strings
     * which are query selectors for the elements intended to be handles.
     * One or multiple handles with class "handle" would have querySelectors
     * of `.handle`, while handles with instead an id of "handle" would
     * have querySelectors of `#handle`.
     */
    dragHandle?: HTMLElement | string | string[];
    /**
     * Props to be passed to the eight resize handles. May include children.
     */
    resizeHandleProps?: ParentProps | {[key in Direction]: ParentProps};
    /**
     * When set to `true`, the "user-select" and "-webkit-user-select"
     * properties are set to "none" while dragging or resizing
     * is taking place.
     */
    disableUserSelect?: boolean;
    /**
    * Specifies the boundaries beyond which the element may not be dragged or
    * resized. Bounds are understood as the "top", "right", "bottom", and "left"
    * attributes of an absolutely positioned item with respect to the window.
    * Setting this to "window" will make the window the boundary, setting this
    * to "parent" will use the bounds of the immediate parent of this element
    * as a boundary. You can also input a custom ref to an HTMLElement,
    * specify custom bounds, or specify a function that returns custom bounds.
    */
    boundary?: "window" | "parent" | HTMLElement | Bounds | (() => Bounds);
    /**
     * When true, if the `boundary` prop is set to "window", "parent", or
     * HTMLElement, then any resizing events will be tracked to ensure
     * that this element remains inside the boundary, though the minimum
     * size will still be obeyed.
     */
    ensureInsideBoundary?: boolean;
    /**
    * A class that will be added to the component whenever it is being actively
    * dragged. Essentially a shortcut to manually doing it with dragStart,
    * resizeStart, dragEnd, and resizeEnd.
    */
    classWhileDragging?: string;
    /**
    * A class that will be added to the component whenever it is being actively
    * resized. Essentially a shortcut to manually doing it with dragStart,
    * resizeStart, dragEnd, and resizeEnd.
    */
    classWhileResizing?: string;
    /**
    * A callback that fires whenever a drag motion has begun
    */
    dragStart?: (e: MouseEvent) => void;
    /**
    * A callback that fires continuously on each mouse
    * movement during a drag motion.
    */
    drag?: (e: MouseEvent, offset: Position, state: State) => void;
    /**
    * A callback fires that when the drag movement is done because
    * the mouse has been lifted up
    */
    dragEnd?: (e: MouseEvent, offset: Position, state: State) => void;
    /**
    * A callback that fires whenever a resize motion has begun
    */
    resizeStart?: (e: MouseEvent) => void;
    /**
    * A callback that fires continuously on each mouse
    * movement during a resize motion.
    */
    resize?: (
        e: MouseEvent,
        direction: Direction,
        resizeData: ResizeData,
        state: State
    ) => void;
    /**
    * A callback fires that when the resize movement is done because
    * the mouse has been lifted up
    */
    resizeEnd?: (
        e: MouseEvent,
        direction: Direction,
        resizeData: ResizeData,
        state: State
    ) => void;
    [other: string]: unknown;
}

export const defaultProps = {
    enabled: true,
    disableUserSelect: true,
    minSize: {
        height: 80,
        width: 80,
    },
}

export const DragAndResize: ParentComponent<Props> = (unmergedProps) => {
    const props = mergeProps(defaultProps, unmergedProps);
    let mainElement: HTMLDivElement | undefined;
    const [state, setState] = createState();

    onMount(() => {
        if (props.initialPosition) {
            setState({
                y: props.initialPosition.y,
                x: props.initialPosition.x,
            });
        }
        if (props.initialSize) {
            setState({
                height: props.initialSize.height,
                width: props.initialSize.width,
            });
        }
    });
    createEffect(() => { if (props.position) setState(props.position); });
    createEffect(() => { if (props.state) setState(props.state); });
    createEffect(() => { if (props.ref) props.ref = mainElement; });

    const observer = new ResizeObserver(() => {
        const boundary = calculateBounds()
        setBounds(boundary);
        ensureInside(boundary);
    });
    const [nowObserving, setNowObserving] = createSignal<HTMLElement>(undefined!);
    const [bounds, setBounds] = createSignal<Bounds>(defaultBounds);
    const calculateBounds = () => {
        if (!mainElement) return defaultBounds;
        let bounds: Bounds;
        if (props.boundary === "parent") {
            const element = mainElement!.parentElement!;
            const rect = element.getBoundingClientRect();
            bounds = {
                top: rect.top,
                right: window.innerWidth - rect.right,
                bottom: window.innerHeight - rect.bottom,
                left: rect.left,
            };
            if (element != nowObserving()) {
                observer.disconnect();
                observer.observe(element);
            }
            setNowObserving(element);
        } else if (props.boundary instanceof HTMLElement) {
            const rect = props.boundary.getBoundingClientRect();
            bounds = {
                top: rect.top,
                right: window.innerWidth - rect.right,
                bottom: window.innerHeight - rect.bottom,
                left: rect.left,
            };
            if (props.boundary != nowObserving()) {
                observer.disconnect();
                observer.observe(props.boundary);
            }
            setNowObserving(props.boundary);
        } else if (typeof props.boundary === "function") {
            observer.disconnect();
            bounds = props.boundary();
        } else if (typeof props.boundary === "object") {
            observer.disconnect();
            bounds = props.boundary;
        }
        else { // Default to window bounds
            observer.disconnect();
            bounds = defaultBounds;
        }
        return bounds;
    }
    createEffect(() => setBounds(calculateBounds()));
    createEffect(() => console.log(bounds()));

    const [userSelect, setUserSelect] = createSignal<boolean>(true);

    const [dragging, setDragging] = createSignal<boolean>(false);
    const [resizing, setResizing] = createSignal<boolean>(false);

    const [dragOffset, setDragOffset] = createSignal<Position>();
    const onDragMove = (e: MouseEvent) => {
        if (resizing()) {
            onDragEnd() // When resizing, don't drag
            return;
        }
        if (props.drag) props.drag(e, dragOffset()!, state);
        mainElement!.style.cursor = "grabbing";
        const offset: Position = dragOffset()!;
        const boundary: Bounds = bounds();
        const dragX = clamp(
            e.clientX - offset.x,
            boundary.left,
            window.innerWidth - state.width - boundary.right,
        );
        const dragY = clamp(
            e.clientY - offset.y,
            boundary.top,
            window.innerHeight - state.height - boundary.bottom,
        );
        setState({x: dragX, y: dragY});
    }
    const onDragEnd = (e: MouseEvent | undefined = undefined) => {
        // The undefined `e` since this is sometimes a standalone function
        if (props.dragEnd && e)
            props.dragEnd(e, dragOffset()!, state);
        setDragging(false);
        mainElement!.style.cursor = "grab";
        document.removeEventListener("mousemove", onDragMove);
        document.removeEventListener("mouseup", onDragEnd);
        if (props.disableUserSelect) setUserSelect(true);
    }
    const onDragStart = (e: MouseEvent) => {
        if (!props.enabled || props.dragEnabled === false) return;
        if (resizing()) {
            onDragEnd(); // When resizing, don't drag
            return;
        }
        if (props.dragStart) props.dragStart(e);
        setDragging(true);
        if (props.disableUserSelect) setUserSelect(false);
        mainElement!.style.cursor = "grabbing";
        setDragOffset({
            x: e.clientX - mainElement!.getBoundingClientRect().left,
            y: e.clientY - mainElement!.getBoundingClientRect().top
        });
        document.addEventListener("mousemove", onDragMove);
        document.addEventListener("mouseup", onDragEnd);
    }

    const [direction, setDirection] = createSignal<Direction>();
    const [resizeEvent, setResizeEvent] = createStore<ResizeData>(defaultResizeData);
    const onResizeMove = (e: MouseEvent) => {
        const resizeData: ResizeData = resizeEvent;
        const newY = e.clientY - resizeData.offsetY;
        const newX = e.clientX - resizeData.offsetX;
        const deltaY = e.clientY - resizeData.init.clientY;
        const deltaX = e.clientX - resizeData.init.clientX;
        const boundary: Bounds = bounds();
        if (props.resize)
            props.resize(e, direction()!, resizeEvent, state);
        let maxSize: Size = {height: Infinity, width: Infinity};
        if (props.maxSize) {
            maxSize = {
                height: props.maxSize.height,
                width: props.maxSize.width,
            };
        }
        const top = {
            y: clamp(
                newY,
                Math.max(
                    boundary.top,
                    resizeData.init.y + resizeData.init.height - maxSize.height),
                resizeData.init.y + resizeData.init.height - props.minSize.height,
            ),
            height: clamp(
                resizeData.init.height - deltaY,
                props.minSize.height,
                maxSize.height,
            ),
        }
        const right = {
            x: resizeData.init.x,
            width: clamp(
                resizeData.init.width + deltaX,
                props.minSize.width,
                Math.min(
                    window.innerWidth - resizeData.init.x - boundary.right,
                    maxSize.width,
                ),
            ),
        }
        const bottom = {
            y: resizeData.init.y,
            height: clamp(
                resizeData.init.height + deltaY,
                props.minSize.height,
                Math.min(
                    window.innerHeight - resizeData.init.y - boundary.bottom,
                    maxSize.height,
                ),
            ),
        };
        const left = {
            x: clamp(
                newX,
                Math.max(
                    boundary.left,
                    resizeData.init.x + resizeData.init.width - maxSize.height),
                resizeData.init.x + resizeData.init.width - props.minSize.width,
            ),
            width: clamp(
                resizeData.init.width - deltaX,
                props.minSize.width,
                maxSize.width,
            ),
        }
        const d = direction()
        if (d === "top") setState(top);
        if (d === "right") setState(right);
        if (d === "bottom") setState(bottom);
        if (d === "left") setState(left);
        if (d === "topRight") setState({...top, ...right});
        if (d === "bottomRight") setState({...right, ...bottom});
        if (d === "bottomLeft") setState({...bottom, ...left});
        if (d === "topLeft") setState({...left, ...top});
    }
    const onResizeEnd = (e: MouseEvent) => {
        if (props.resizeEnd)
            props.resizeEnd(e, direction()!, resizeEvent, state);
        setResizing(false);
        setDirection(undefined);
        if (props.disableUserSelect) setUserSelect(true);
        document.removeEventListener("mousemove", onResizeMove);
        document.removeEventListener("mouseup", onResizeEnd);
    };
    const onResizeStart: ResizeCallback = (e, direction) => {
        if (!props.enabled || props.resizeEnabled === false) return
        if (props.resizeStart) props.resizeStart(e);
        setResizing(true);
        setDirection(direction);
        if (props.disableUserSelect) setUserSelect(false);
        const rect = mainElement!.getBoundingClientRect()
        setResizeEvent({
            offsetY: e.clientY - rect.top,
            offsetX: e.clientX - rect.left,
            init: {
                y: state.y,
                x: state.x,
                height: state.height,
                width: state.width,
                clientY: e.clientY,
                clientX: e.clientX,
                right: rect.right,
                bottom: rect.bottom,
            }
        });
        document.addEventListener("mousemove", onResizeMove);
        document.addEventListener("mouseup", onResizeEnd);
    };

    const ensureInside = (boundary: Bounds) => {
        if (!mainElement) return
        const rect = mainElement.getBoundingClientRect();
        const newState = {
            y: clamp(
                rect.y,
                boundary.top,
                Math.max(0, window.innerHeight - rect.height - boundary.bottom),
            ),
            x: clamp(
                rect.x,
                boundary.left,
                Math.max(0, window.innerWidth - rect.width - boundary.right),
            ),
            height: Math.max(
                Math.min(rect.height, window.innerHeight - boundary.top - boundary.bottom),
                props.minSize.height,
            ),
            width: Math.max(
                Math.min(rect.width, window.innerWidth - boundary.left - boundary.right),
                props.minSize.width,
            ),
        };
        setState(newState);
        mainElement.style.x = newState.x + "px";
        mainElement.style.y = newState.y + "px";
        mainElement.style.height = newState.height + "px";
        mainElement.style.width = newState.width + "px";
    }
    const ensureInsideWindow = () => ensureInside(bounds());
    window.addEventListener("resize", ensureInsideWindow);

    const dragEventDeps: HTMLElement[] = [];
    const manageDragHandle = () => {
        dragEventDeps.forEach((el) => el.removeEventListener("mousedown", onDragStart));
        dragEventDeps.length = 0;
        if (!props.dragHandle && mainElement)
            dragEventDeps[0] = mainElement;
        else if (props.dragHandle instanceof HTMLElement)
            dragEventDeps[0] = props.dragHandle;
        else if (typeof(props.dragHandle) === "string") {
            document.querySelectorAll(props.dragHandle).forEach((handle) => {
                dragEventDeps.push(handle as HTMLElement);
            });
        } else if (Array.isArray(props.dragHandle) && props.dragHandle.every((i) => typeof(i) === "string")) {
            props.dragHandle.forEach((handleName) => {
                document.querySelectorAll(handleName).forEach((handle) => {
                    dragEventDeps.push(handle as HTMLElement);
                });
            });
        }
        dragEventDeps.forEach((el) => {
            el.addEventListener("mousedown", onDragStart);
        });
    }
    createEffect(() => manageDragHandle());

    onCleanup(() => {
        window.removeEventListener("resize", ensureInsideWindow);
        document.addEventListener("mousemove", onResizeMove);
        document.addEventListener("mouseup", onResizeEnd);
        dragEventDeps.forEach((el) => el.removeEventListener("mousedown", onDragStart));
    });

    return (
        <div
            {...props}
            ref={mainElement!}
            // @ts-expect-error
            style={Object.assign({
                position: "absolute",
                top: state.y + "px",
                left: state.x + "px",
                height: state.height + "px",
                width: state.width + "px",
                "user-select": userSelect() ? "auto" : "none",
                "-webkit-user-select": userSelect() ? "auto" : "none",
            }, props.style)}
            classList={Object.assign({
                [props.classWhileDragging!]: dragging(),
                [props.classWhileResizing!]: resizing(),
            }, props.classList)}>
            <For each={directions}>
                {(direction) => {
                    return (
                        <ResizeHandle
                            direction={direction}
                            resizeCallback={onResizeStart}
                            {...props.resizeHandleProps}
                        />
                    )
                }}
            </For>
            { props.children }
        </div>
    );
}
