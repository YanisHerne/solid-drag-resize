import {
    mergeProps,
    ParentComponent,
    ParentProps,
    Component,
    For,
    JSX,
    createSignal,
    createEffect,
    createMemo,
    onMount,
} from "solid-js";
import { createStore} from "solid-js/store"
import {
    ResizeDirections,
    Direction,
    ResizeCallback,
    ResizeHandle,
    DirectionMap,
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

export const DefaultState: State = {
    x: 0,
    y: 0,
    height: 100,
    width: 100,
}

const createState = (defaultState: State = DefaultState):
[ get: State, (to: RequireAtLeastTwo<State>) => void ] => {
    const [state, setState] = createStore<State>(defaultState);
    const update =(to: RequireAtLeastTwo<State>) => {
        setState(to);
    };
    return [state, update];
}

type ResizeData = State & {
    offsetY: number;
    offsetX: number;
    initY: number;
    initX: number;
};

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
    * Drag boundaries currently broken, default is usable
    * at inset of 0 to all sides of the window
    */
    boundary?: "window" | "parent" | HTMLElement | (() => Bounds);
    /**
    * A class that will be added to the component whenever it
    * is being actively dragged.
    */
    classWhileDragging?: string;
    /**
    * A class that will be added to the component whenever it
    * is being actively resized.
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
        height: 20,
        width: 20,
    },
}

export const DragAndResize: ParentComponent<Props> = (unmergedProps) => {
    const props = mergeProps(defaultProps, unmergedProps);
    let mainElement: HTMLDivElement | undefined;
    let dragHandle: HTMLElement | undefined;
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

    const [bounds, setBounds] = createSignal<Bounds>(defaultBounds);
    const calculateBounds = () => {
        let bounds: Bounds;
        if (props.boundary === "parent") {
            const rect = mainElement!.parentElement?.getBoundingClientRect()!;
            bounds = {
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
                left: rect.left,
            };
        } else if (props.boundary instanceof HTMLElement) {
            const rect = props.boundary.getBoundingClientRect();
            bounds = {
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
                left: rect.left,
            };
        } else if (typeof props.boundary === "function") {
            bounds = props.boundary();
        }
        else { // Default to window bounds
            bounds = defaultBounds;
        }
        return bounds
    }
    createMemo(() => setBounds(calculateBounds()));

    const [userSelect, setUserSelect] = createSignal<"unset"|"none"|"all">("unset");

    const [dragging, setDragging] = createSignal<boolean>(false);
    const [resizing, setResizing] = createSignal<boolean>(false);

    const [dragOffset, setDragOffset] = createSignal<Position>();
    const onDragMove = (e: MouseEvent) => {
        if (resizing()) {
            onDragEnd() // When resizing, don't drag
            return;
        }
        if (props.drag)
            props.drag(e, dragOffset()!, state);
        mainElement!.style.cursor = "grabbing";
        const offset: { x: number; y: number; } = dragOffset()!;
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
        if (props.disableUserSelect) setUserSelect("unset");
    }
    const onDragStart = (e: MouseEvent) => {
        if (!props.enabled || props.dragEnabled === false) return;
        if (resizing()) {
            onDragEnd(); // When resizing, don't drag
            return;
        }
        if (props.dragStart) props.dragStart(e);
        setDragging(true);
        if (props.disableUserSelect) setUserSelect("none");
        mainElement!.style.cursor = "grabbing";
        setDragOffset({
            x: e.clientX - mainElement!.getBoundingClientRect().left,
            y: e.clientY - mainElement!.getBoundingClientRect().top
        });
        document.addEventListener("mousemove", onDragMove);
        document.addEventListener("mouseup", onDragEnd);
    }

    const [direction, setDirection] = createSignal<Direction>();
    const [resizeOffset, setResizeOffset] = createSignal<ResizeData>();
    const onResizeMove = (e: MouseEvent) => {
        const offset: {
            offsetY: number;
            offsetX: number;
            initY: number;
            initX: number;
            y: number;
            x: number;
            height: number;
            width: number;
        } = resizeOffset()!;
        const newY = e.clientY - offset.offsetY;
        const newX = e.clientX - offset.offsetX;
        const deltaY = e.clientY - offset.initY;
        const deltaX = e.clientX - offset.initX;
        const boundary: Bounds = bounds();
        if (props.resize)
            props.resize(e, direction()!, resizeOffset()!, state);
        const top = {
            y: newY,
            height: offset.height - deltaY,
        }
        const right = {
            x: offset.x,
            width: offset.width + deltaX,
        }
        const bottom = {
            y: offset.y,
            height: offset.height + deltaY,
        };
        const left = {
            x: newX,
            width: offset.width - deltaX
        }
        switch(direction()) {
            case "top":
                setState(top);
                break;
            case "right":
                setState(right);
                break;
            case "bottom":
                setState(bottom);
                break;
            case "left":
                setState(left);
                break;
            case "topRight":
                setState({...top, ...right});
                break;
            case "bottomRight":
                setState({...right, ...bottom});
                break;
            case "bottomLeft":
                setState({...bottom, ...left});
                break;
            case "topLeft":
                setState({...left, ...top});
                break;
        }
    }
    const onResizeEnd = (e: MouseEvent) => {
        if (props.resizeEnd)
            props.resizeEnd(e, direction()!, resizeOffset()!, state);
        setResizing(false);
        setDirection(undefined);
        document.removeEventListener("mousemove", onResizeMove);
        document.removeEventListener("mouseup", onResizeEnd);
    };
    const onResizeStart: ResizeCallback = (e, direction) => {
        if (!props.enabled || props.resizeEnabled === false) return
        if (props.resizeStart) props.resizeStart(e);
        setResizing(true);
        setDirection(direction);
        setResizeOffset({
            offsetY: e.clientY - mainElement!.getBoundingClientRect().top,
            offsetX: e.clientX - mainElement!.getBoundingClientRect().left,
            initY: e.clientY,
            initX: e.clientX,
            x: state.x,
            y: state.y,
            height: state.height,
            width: state.width
        });
        document.addEventListener("mousemove", onResizeMove);
        document.addEventListener("mouseup", onResizeEnd);
    };

    const manageDragHandle = () => {
        console.log("Managing" + JSON.stringify(props.dragHandle));
        if (!props.dragHandle && mainElement) {
            console.log("1");
            mainElement.addEventListener("mousedown", onDragStart);
        } else {
            if (mainElement) mainElement.removeEventListener("mousedown", onDragStart);
            if (props.dragHandle instanceof HTMLElement) {

                console.log("2");
                props.dragHandle.addEventListener("mousedown", onDragStart);
            } else if (typeof(props.dragHandle) === "string") {
                console.log("3");
                document.querySelectorAll(props.dragHandle).forEach((handle) => {
                    handle.addEventListener("mousedown", onDragStart as ((e: Event) => void));
                });
            } else if (Array.isArray(props.dragHandle) && props.dragHandle.every((i) => typeof(i) === "string")) {
                console.log("4");
                props.dragHandle.forEach((handleName) => {
                    document.querySelectorAll(handleName).forEach((handle) => {
                        handle.addEventListener("mousedown", onDragStart as ((e: Event) => void));
                    });
                });
            }
        }
    }
    onMount(() => manageDragHandle());
    createMemo(() => manageDragHandle());

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
                "user-select": userSelect(),
                "-webkit-user-select": userSelect(),
            }, props.style)}
            classList={Object.assign({
                [props.classWhileDragging!]: dragging(),
                [props.classWhileResizing!]: resizing(),
            }, props.classList)}>
            <For each={ResizeDirections}>
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
