import {
    mergeProps,
    ParentComponent,
    ParentProps,
    For,
    createSignal,
    createEffect,
    onMount,
    onCleanup,
    JSX,
} from "solid-js";
import { createStore} from "solid-js/store"
import {
    directions,
    Direction,
    ResizeCallback,
    ResizeHandle,
} from "./resize";

const clamp = (num: number, min: number, max:number) => {
    return Math.min(Math.max(num, min), max);
}

export type Position = {
    x: number;
    y: number;
}

const zeroPosition = {
    x: 0,
    y: 0,
};

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

/**
 * An action consists of the initial state, generated when the action begins,
 * and then a proposed state change, along with an amended state change that
 * takes boundaries into account.
 */
type Action = {
    type: "drag" | "resize";
    init: State;
    proposed: State;
    amended: State;
};

const defaultAction: Action = {
    type: "drag",
    init: defaultState,
    proposed: defaultState,
    amended: defaultState,
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
    ref?: HTMLDivElement;
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
     * A function to call that will recalculate the current boundaries and
     * mutate the current state to stay within those boundaries while
     * obeying any size restrictions.
     */
    ensureInsideFunc?: Function;
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
    resize?: ( e: MouseEvent, direction: Direction, action: Action) => void;
    /**
    * A callback fires that when the resize movement is done because
    * the mouse has been lifted up
    */
    resizeEnd?: ( e: MouseEvent, direction: Direction, action: Action) => void;
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
    const [state, setState] = createStore<State>(defaultState);

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
    createEffect(() => { props.ref = mainElement; });

    const observer = new ResizeObserver(() => {
        const boundary = calculateBounds()
        bounds = boundary;
        ensureInside(boundary);
    });
    let nowObserving: HTMLElement;
    let bounds: Bounds;
    const calculateBounds = () => {
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
            if (element != nowObserving) {
                observer.disconnect();
                observer.observe(element);
            }
            nowObserving = element;
        } else if (props.boundary instanceof HTMLElement) {
            const rect = props.boundary.getBoundingClientRect();
            bounds = {
                top: rect.top,
                right: window.innerWidth - rect.right,
                bottom: window.innerHeight - rect.bottom,
                left: rect.left,
            };
            if (props.boundary != nowObserving) {
                observer.disconnect();
                observer.observe(props.boundary);
            }
            nowObserving = props.boundary;
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
        console.log(bounds);
        return bounds;
    }
    createEffect(() => bounds = calculateBounds());

    // These are only signals so they can be reactive for UI changes in the JSX
    const [userSelect, setUserSelect] = createSignal<boolean>(true);
    const [dragging, setDragging] = createSignal<boolean>(false);
    const [resizing, setResizing] = createSignal<boolean>(false);

    let action: Action = defaultAction;
    // What is the original position of the element prior to transformation,
    // that the transformation is being applied to?
    let origin: Position = zeroPosition;
    // Where, relative to the element, is the cursor? (To prevent jumping
    // to the cursor when an action begins
    let offset: Position = zeroPosition;

    const amendAction = (proposed: State): State => {
        const amended = proposed;
        amended.x = clamp(
            proposed.x,
            bounds.left,
            window.innerWidth - state.width - bounds.right,
        );
        amended.y = clamp(
            proposed.y,
            bounds.top,
            window.innerHeight - state.height - bounds.bottom,
        );
        console.log("proposed " + JSON.stringify(proposed));
        console.log("amended " + JSON.stringify(amended));
        return amended;
    }

    const onDragMove = (e: MouseEvent) => {
        if (resizing()) {
            onDragEnd() // When resizing, don't drag
            return;
        }
        if (props.drag) props.drag(e, offset, state);
        mainElement!.style.cursor = "grabbing";
        action.proposed = {
            x: e.clientX - offset.x,
            y: e.clientY - offset.y,
            height: state.height,
            width: state.width,
        };
        action.amended = amendAction(action.proposed);
        setState({x: action.amended.x - origin.x, y: action.amended.y - origin.y});
    }
    const onDragEnd = (e: MouseEvent | undefined = undefined) => {
        // The undefined `e` since this is sometimes a standalone function
        if (props.dragEnd && e)
            props.dragEnd(e, offset, state);
        setDragging(false);
        mainElement!.style.cursor = "grab";
        document.removeEventListener("mousemove", onDragMove);
        document.removeEventListener("mouseup", onDragEnd);
        if (props.disableUserSelect) setUserSelect(true);
    }
    const onDragStart = (e: MouseEvent) => {
        if (!mainElement) return;
        if (!props.enabled || props.dragEnabled === false) return;
        if (resizing()) {
            onDragEnd(); // When resizing, don't drag
            return;
        }
        if (props.dragStart) props.dragStart(e);
        if (props.disableUserSelect) setUserSelect(false);
        mainElement.style.cursor = "grabbing";
        setDragging(true);
        console.log(calculateBounds());
        const rect = mainElement.getBoundingClientRect();
        origin = {
            x: rect.left - state.x,
            y: rect.top - state.y,
        };
        offset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        action.init =  {
            x: state.x,
            y: state.y,
            height: state.height,
            width: state.width
        };
        document.addEventListener("mousemove", onDragMove);
        document.addEventListener("mouseup", onDragEnd);
    }

    let direction: Direction;
    const onResizeMove = (e: MouseEvent) => {
        const deltaY = e.clientY - offset.y;
        const deltaX = e.clientX - offset.x;
        if (props.resize)
            props.resize(e, direction!, action);
        let maxSize: Size = {height: Infinity, width: Infinity};
        if (props.maxSize) {
            maxSize = {
                height: props.maxSize.height,
                width: props.maxSize.width,
            };
        }
        const top = {
            y: clamp(
                deltaY + action.init.y,
                Math.max(
                    bounds.top - origin.y,
                    action.init.y + action.init.height - maxSize.height,
                ),
                action.init.y + action.init.height - props.minSize.height,
            ),
            height: clamp(
                action.init.height - deltaY,
                props.minSize.height,
                maxSize.height,
            ),
        }
        const right = {
            x: action.init.x,
            width: clamp(
                action.init.width + deltaX,
                props.minSize.width,
                Math.min(
                    window.innerWidth - origin.x - action.init.x - bounds.right,
                    maxSize.width,
                ),
            ),
        }
        const bottom = {
            y: action.init.y,
            height: clamp(
                action.init.height + deltaY,
                props.minSize.height,
                Math.min(
                    window.innerHeight - origin.y - action.init.y - bounds.bottom,
                    maxSize.height,
                ),
            ),
        };
        const left = {
            x: clamp(
                deltaX + action.init.x,
                Math.max(
                    bounds.left - origin.x,
                    action.init.x + action.init.width - maxSize.width,
                ),
                action.init.x + action.init.width - props.minSize.width,
            ),
            width: clamp(
                action.init.width - deltaX,
                props.minSize.width,
                maxSize.width,
            ),
        }

        const d = direction
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
            props.resizeEnd(e, direction!, action);
        setResizing(false);
        if (props.disableUserSelect) setUserSelect(true);
        document.removeEventListener("mousemove", onResizeMove);
        document.removeEventListener("mouseup", onResizeEnd);
    };
    const onResizeStart: ResizeCallback = (e, dir) => {
        if (!props.enabled || props.resizeEnabled === false) return;
        if (props.resizeAxes && props.resizeAxes[dir] === false) return;
        if (!mainElement) return;
        if (props.resizeStart) props.resizeStart(e);
        if (props.disableUserSelect) setUserSelect(false);
        setResizing(true);
        direction = dir;
        calculateBounds();
        const rect = mainElement.getBoundingClientRect();
        origin = {
            x: rect.left - state.x,
            y: rect.top - state.y,
        };
        offset = {
            x: e.clientX,
            y: e.clientY,
        }
        action.init = {
            y: state.y,
            x: state.x,
            height: state.height,
            width: state.width,
        };
        document.addEventListener("mousemove", onResizeMove);
        document.addEventListener("mouseup", onResizeEnd);
    };

    const ensureInside = (boundary: Bounds) => {
        if (!mainElement) return
        action.proposed = {
            x: state.x + origin.x,
            y: state.y + origin.y,
            height: state.height,
            width: state.width,
        };
        action.amended = amendAction(action.proposed);
        action.amended.x -= origin.x;
        action.amended.y -= origin.y;
        setState(action.amended);
    }
    createEffect(() => {
        if (props.ensureInsideFunc) props.ensureInsideFunc = ensureInside
    });
    const ensureInsideWindow = () => ensureInside(calculateBounds());
    window.addEventListener("resize", ensureInsideWindow);

    const handles: HTMLElement[] = [];
    const manageDragHandle = () => {
        handles.forEach((el) => el.removeEventListener("mousedown", onDragStart));
        handles.length = 0;
        if (!props.dragHandle && mainElement)
            handles[0] = mainElement;
        else if (props.dragHandle instanceof HTMLElement)
            handles[0] = props.dragHandle;
        else if (typeof(props.dragHandle) === "string") {
            document.querySelectorAll(props.dragHandle).forEach((handle) => {
                handles.push(handle as HTMLElement);
            });
        } else if (Array.isArray(props.dragHandle) && props.dragHandle.every((i) => typeof(i) === "string")) {
            props.dragHandle.forEach((handleName) => {
                document.querySelectorAll(handleName).forEach((handle) => {
                    handles.push(handle as HTMLElement);
                });
            });
        }
        handles.forEach((el) => {
            el.addEventListener("mousedown", onDragStart);
        });
    }
    createEffect(() => {
        props.dragHandle;
        setTimeout(() => manageDragHandle(), 0)
    });

    onCleanup(() => {
        window.removeEventListener("resize", ensureInsideWindow);
        document.addEventListener("mousemove", onResizeMove);
        document.addEventListener("mouseup", onResizeEnd);
        handles.forEach((el) => el.removeEventListener("mousedown", onDragStart));
    });

    return (
        <div
            {...props}
            ref={mainElement}
            style={Object.assign({
                transform: "translate(" + state.x + "px," + state.y + "px)",
                height: state.height + "px",
                width: state.width + "px",
                "user-select": userSelect() ? "auto" : "none",
                "-webkit-user-select": userSelect() ? "auto" : "none",
            }, props.style) as JSX.CSSProperties} // Typescript massaging
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
                            enabled={props.enabled}
                            resizeEnabled={props.resizeEnabled}
                            {...props.resizeHandleProps}
                        />
                    )
                }}
            </For>
            { props.children }
        </div>
    );
}
