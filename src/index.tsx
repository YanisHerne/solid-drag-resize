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
import { isServer } from "solid-js/web";
import { createStore } from "solid-js/store";
import { directions, Direction, ResizeCallback, ResizeHandle } from "./resize";

const clamp = (num: number, min: number, max: number) => {
    return Math.min(Math.max(num, min), max);
};

export type Position = {
    x: number;
    y: number;
};

const zeroPosition = {
    x: 0,
    y: 0,
};

export type Bounds = {
    top: number;
    right: number;
    bottom: number;
    left: number;
};

type Size = {
    height: number;
    width: number;
};

export type State = Position & Size;

const isState = (obj: unknown): obj is State => {
    return (
        typeof obj === "object" &&
        obj !== null &&
        "x" in obj &&
        "y" in obj &&
        "width" in obj &&
        "height" in obj &&
        typeof obj.x === "number" &&
        typeof obj.y === "number" &&
        typeof obj.width === "number" &&
        typeof obj.height === "number"
    );
};

export const defaultState: State = {
    x: 0,
    y: 0,
    height: 100,
    width: 100,
};

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
};

export interface Props {
    /**
     * Defaults to true. The component cannot be dragged or resized when this
     * is false. The component's position and size can still be
     * programmatically controlled via the `position` and `state` properties.
     * Inputting an object with the keys `drag`, `resize`, or both, with
     * boolean values, can separate control of dragging and resizing.
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
     * If you set this prop, only those directions which are set to true will
     * have their resize handles instantiated.
     */
    resizeAxes?: { [key in Direction]?: boolean };
    /**
     * The size the component starts at before any events fire.
     */
    initialState?: Partial<State>;
    /**
     * Changing this prop will do a shallow merge of the component's state,
     * that being simply an intersection type of the x and y coordinates
     * with the width and height of the component.
     */
    state?: Partial<State>;
    /**
     * Resizing will be prevented below this size, though a smaller size
     * may be programmatically set by the `state` prop.
     */
    minSize?: Partial<Size>;
    /**
     * Resizing will be prevented above this size, though a larger size
     * may be programmatically set by the `state` prop.
     */
    maxSize?: Partial<Size>;
    /**
     * A variety of ways to describe a drag handle to be used in lieu of
     * the entire element, which is used by default. Events will be bound
     * either directly onto an `HTMLElement` or to one or multiple strings
     * which are query selectors for the elements intended to be handles.
     * One or multiple handles with class "handle" would have querySelectors
     * of `.handle`, while handles with instead an id of "handle" would
     * have querySelectors of `#handle`.
     */
    dragHandle?: HTMLElement | string | (HTMLElement | string)[];
    /**
     * Props to be passed to the eight resize handles. May include children.
     */
    resizeHandleProps?:
        | {
              all: { [other: string]: unknown };
          }
        | { [key in Direction]: ParentProps & Props };
    customResizeHandle?: Partial<{ [key in Direction]: Element }>;
    /**
     * When set to `true`, the "user-select" and "-webkit-user-select"
     * properties are set to "none" while dragging or resizing
     * is taking place.
     */
    disableUserSelect?: boolean;
    /**
     * If set, specifies the boundaries beyond which the element may not be
     * dragged or resized. Bounds are understood as the "top", "right", "bottom",
     * and "left" attributes of an absolutely positioned item with respect to
     * the window. Setting this to "window" will make the window the boundary,
     * setting this to "parent" will use the bounds of the immediate parent of
     * this element as a boundary. You can also input a custom ref to an
     * HTMLElement, specify custom bounds, or specify a function that returns
     * custom bounds.
     */
    boundary?: "window" | "parent" | HTMLElement | Bounds | (() => Bounds) | undefined;
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
    dragStart?: (e: MouseEvent) => void | State;
    /**
     * A callback that fires continuously on each mouse
     * movement during a drag motion.
     */
    drag?: (e: MouseEvent, offset: Position, state: State) => void | State;
    /**
     * A callback fires that when the drag movement is done because
     * the mouse has been lifted up
     */
    dragEnd?: (e: MouseEvent, offset: Position, state: State) => void | State;
    /**
     * A callback that fires whenever a resize motion has begun
     */
    resizeStart?: (e: MouseEvent) => void | State;
    /**
     * A callback that fires continuously on each mouse
     * movement during a resize motion.
     */
    resize?: (e: MouseEvent, direction: Direction, action: Action) => void | State;
    /**
     * A callback fires that when the resize movement is done because
     * the mouse has been lifted up
     */
    resizeEnd?: (e: MouseEvent, direction: Direction, action: Action) => void | State;
    onEnsureInside?: (action: Action, bounds: Bounds, origin: Position) => void | State;
    [other: string]: unknown;
}

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
export type DragAndResizeProps = Prettify<Props>

export const defaultProps = {
    enabled: true,
    disableUserSelect: true,
};

export const DragAndResize: ParentComponent<Props> = (unmergedProps) => {
    const props = mergeProps(defaultProps, unmergedProps);
    let mainElement: HTMLDivElement | undefined;
    const [state, setState] = createStore<State>(defaultState);

    onMount(() => {
        if (props.initialState) {
            const initialState: State = defaultState;
            if (props.initialState.y) initialState.y = props.initialState.y;
            if (props.initialState.x) initialState.x = props.initialState.x;
            if (props.initialState.height) initialState.height = props.initialState.height;
            if (props.initialState.width) initialState.width = props.initialState.width;
            setState(initialState);
        }
    });
    createEffect(() => {
        if (props.position) setState(props.position);
    });
    createEffect(() => {
        if (props.state) setState(props.state);
    });
    createEffect(() => {
        props.ref = mainElement; // eslint-disable-line
    });

    // The boundary is recalculated and obeyed with this observer
    let observer: ResizeObserver;
    onMount(() => {
        // ResizeObserver cannot be SSR-ed since it is a browser only API
        observer = new ResizeObserver(() => {
            const boundary = calculateBounds();
            bounds = boundary;
            ensureInside(boundary);
        });
    });
    let nowObserving: HTMLElement;
    let bounds: Bounds | undefined;
    const calculateBounds = () => {
        if (props.boundary === "parent") {
            const element = mainElement!.parentElement!;
            const rect = element.getBoundingClientRect();
            bounds = {
                top: rect.top,
                right: window.innerWidth - rect.right,
                bottom: window.innerHeight - rect.bottom,
                left: rect.left,
            };
            if (element !== nowObserving) {
                observer.disconnect();
                observer.observe(element);
            }
            nowObserving = element;
        } else if (props.boundary === "window") {
            bounds = {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
            };
            observer.disconnect();
        } else if (props.boundary instanceof HTMLElement) {
            const rect = props.boundary.getBoundingClientRect();
            bounds = {
                top: rect.top,
                right: window.innerWidth - rect.right,
                bottom: window.innerHeight - rect.bottom,
                left: rect.left,
            };
            if (props.boundary !== nowObserving) {
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
        } else {
            // Default to no bounds
            observer.disconnect();
            bounds = undefined;
        }
        //ensureInside(bounds);
        return bounds;
    };
    createEffect(() => {
        bounds = calculateBounds();
    });

    // These are signals & not vars so they can be reactive for JSX
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

    const amendDrag = (proposed: State, bounds: Bounds | undefined): State => {
        if (!bounds) return proposed; // Return with no amendments
        let amended: State = defaultState;
        amended.x = clamp(proposed.x, bounds.left, window.innerWidth - state.width - bounds.right);
        amended.y = clamp(
            proposed.y,
            bounds.top,
            window.innerHeight - state.height - bounds.bottom,
        );
        return amended;
    };
    const onDragMove = (e: PointerEvent) => {
        if (resizing()) {
            onDragEnd(); // When resizing, don't drag
            return;
        }
        calculateBounds();
        action.proposed = {
            x: e.clientX - offset.x,
            y: e.clientY - offset.y,
            height: state.height,
            width: state.width,
        };
        action.amended = amendDrag(action.proposed, bounds);
        if (props.drag) {
            const result = props.drag(e, offset, state);
            if (isState(result)) setState(result);
        }
        setState({ x: action.amended.x - origin.x, y: action.amended.y - origin.y });
    };
    const onDragEnd = (e: MouseEvent | undefined = undefined) => {
        // The undefined `e` since this is sometimes a standalone function
        setDragging(false);
        document.removeEventListener("pointermove", onDragMove);
        document.removeEventListener("pointerup", onDragEnd);
        document.removeEventListener("pointercancel", onDragEnd);
        if (props.disableUserSelect) setUserSelect(true);
        if (props.dragEnd && e) {
            const result = props.dragEnd(e, offset, state);
            if (isState(result)) setState(result);
        }
    };
    const onDragStart = (e: PointerEvent) => {
        if (e.button > 1) return;
        if (!mainElement) return;
        if (!props.enabled || props.dragEnabled === false) return;
        if (resizing()) {
            onDragEnd(); // When resizing, don't drag
            return;
        }
        if (props.disableUserSelect) setUserSelect(false);
        setDragging(true);
        const rect = mainElement.getBoundingClientRect();
        origin = {
            x: rect.left - state.x,
            y: rect.top - state.y,
        };
        offset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
        action.init = {
            x: state.x,
            y: state.y,
            height: state.height,
            width: state.width,
        };
        document.addEventListener("pointermove", onDragMove);
        document.addEventListener("pointerup", onDragEnd);
        document.addEventListener("pointercancel", onDragEnd);
        if (props.dragStart) {
            const result = props.dragStart(e);
            if (isState(result)) setState(result);
        }
    };

    let direction: Direction;
    const onResizeMove = (e: PointerEvent) => {
        if (!bounds)
            bounds = {
                top: -Infinity,
                right: -Infinity,
                bottom: -Infinity,
                left: -Infinity,
            };
        const deltaY = e.clientY - offset.y;
        const deltaX = e.clientX - offset.x;
        let maxSize: Size = { height: Infinity, width: Infinity };
        if (props.maxSize) {
            if (props.maxSize.height) maxSize.height = props.maxSize.height;
            if (props.maxSize.width) maxSize.width = props.maxSize.width;
        }
        let minSize: Size = { height: 0, width: 0 };
        if (props.minSize) {
            if (props.minSize.height) minSize.height = props.minSize.height;
            if (props.minSize.width) minSize.width = props.minSize.width;
        }
        const top = {
            y: clamp(
                deltaY + action.init.y,
                Math.max(
                    bounds.top - origin.y,
                    action.init.y + action.init.height - maxSize.height,
                ),
                action.init.y + action.init.height - minSize.height,
            ),
            height: clamp(
                action.init.height - deltaY,
                minSize.height,
                Math.min(
                    maxSize.height,
                    action.init.y + action.init.height - bounds.top + origin.y,
                ),
            ),
        };
        const right = {
            x: action.init.x,
            width: clamp(
                action.init.width + deltaX,
                minSize.width,
                Math.min(
                    window.innerWidth - origin.x - action.init.x - bounds.right,
                    maxSize.width,
                ),
            ),
        };
        const bottom = {
            y: action.init.y,
            height: clamp(
                action.init.height + deltaY,
                minSize.height,
                Math.min(
                    window.innerHeight - origin.y - action.init.y - bounds.bottom,
                    maxSize.height,
                ),
            ),
        };
        const left = {
            x: clamp(
                deltaX + action.init.x,
                Math.max(bounds.left - origin.x, action.init.x + action.init.width - maxSize.width),
                action.init.x + action.init.width - minSize.width,
            ),
            width: clamp(
                action.init.width - deltaX,
                minSize.width,
                Math.min(maxSize.width, action.init.x + action.init.width - bounds.left + origin.x),
            ),
        };
        if (direction === "top") action.proposed = { ...action.init, ...top };
        if (direction === "right") action.proposed = { ...action.init, ...right };
        if (direction === "bottom") action.proposed = { ...action.init, ...bottom };
        if (direction === "left") action.proposed = { ...action.init, ...left };
        if (direction === "topRight") action.proposed = { ...action.init, ...top, ...right };
        if (direction === "bottomRight") action.proposed = { ...action.init, ...right, ...bottom };
        if (direction === "bottomLeft") action.proposed = { ...action.init, ...bottom, ...left };
        if (direction === "topLeft") action.proposed = { ...action.init, ...left, ...top };
        action.amended = action.proposed;
        if (props.resize) {
            let amended = props.resize(e, direction!, action);
            if (amended) action.amended = amended;
        }
        setState(action.amended);
    };
    const onResizeEnd = (e: PointerEvent) => {
        if (props.resizeEnd) props.resizeEnd(e, direction!, action);
        setResizing(false);
        if (props.disableUserSelect) setUserSelect(true);
        document.removeEventListener("pointermove", onResizeMove);
        document.removeEventListener("pointerup", onResizeEnd);
        document.removeEventListener("pointercancel", onResizeEnd);
    };
    const onResizeStart: ResizeCallback = (e, dir) => {
        if (e.button > 1) return;
        if (!mainElement) return;
        if (!props.enabled || props.resizeEnabled === false) return;
        if (props.resizeAxes && props.resizeAxes[dir] === false) return;
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
        };
        action.init = {
            y: state.y,
            x: state.x,
            height: state.height,
            width: state.width,
        };
        action.type = "resize";
        document.addEventListener("pointermove", onResizeMove);
        document.addEventListener("pointerup", onResizeEnd);
        document.addEventListener("pointercancel", onResizeEnd);
    };

    const ensureInside = (boundary: Bounds | undefined) => {
        if (!boundary) return;
        if (!mainElement) return;
        action.proposed = state;
        action.amended = amendDrag(action.proposed, boundary);
        if (props.onEnsureInside) {
            const result = props.onEnsureInside(action, boundary, origin);
            if (result !== undefined && typeof result === "object") action.amended = result;
        }
        console.log("ENSURE" + JSON.stringify(action.amended));
        setState(action.amended);
    };
    const ensureInsideWindow = () => ensureInside(calculateBounds());
    // window object will only be defined on the client side
    if (!isServer) {
        window.addEventListener("resize", ensureInsideWindow); // Named so can be detached
    }

    const handles: HTMLElement[] = [];
    const manageDragHandle = () => {
        handles.forEach((el) => el.removeEventListener("pointerdown", onDragStart));
        handles.length = 0;
        if (!props.dragHandle && mainElement) {
            handles[0] = mainElement;
        } else if (props.dragHandle instanceof HTMLElement) {
            handles[0] = props.dragHandle;
        } else if (typeof props.dragHandle === "string") {
            document.querySelectorAll(props.dragHandle).forEach((handle) => {
                handles.push(handle as HTMLElement);
            });
        } else if (
            Array.isArray(props.dragHandle) &&
            props.dragHandle.every((i) => typeof i === "string" || i instanceof HTMLElement)
        ) {
            props.dragHandle.forEach((handle) => {
                if (typeof handle === "string") {
                    document.querySelectorAll(handle).forEach((h) => {
                        handles.push(h as HTMLElement);
                    });
                } else {
                    handles.push(handle);
                }
            });
        }
        handles.forEach((el) => {
            el.addEventListener("pointerdown", onDragStart);
        });
    };
    createEffect(() => {
        manageDragHandle();
    });

    onCleanup(() => {
        if (!isServer) {
            window.removeEventListener("resize", ensureInsideWindow);
            document.removeEventListener("pointermove", onResizeMove);
            document.removeEventListener("pointerup", onResizeEnd);
        }
        handles.forEach((el) => el.removeEventListener("pointerdown", onDragStart));
    });

    return (
        <div
            {...props}
            ref={mainElement}
            style={
                Object.assign(
                    {
                        //transform: "translate(" + state.x + "px," + state.y + "px)",
                        translate: state.x + "px " + state.y + "px",
                        height: state.height + "px",
                        width: state.width + "px",
                        "user-select": userSelect() ? "auto" : "none",
                        "-webkit-user-select": userSelect() ? "auto" : "none",
                    },
                    props.style,
                ) as JSX.CSSProperties
            } // Typescript massaging
            classList={Object.assign(
                {
                    [props.classWhileDragging!]: dragging(),
                    [props.classWhileResizing!]: resizing(),
                },
                props.classList,
            )}
        >
            <For each={directions}>
                {(direction) => {
                    if (props.resizeAxes && props.resizeAxes[direction] === false) return;
                    if (props.resizeHandleProps) {
                        if ("all" in props.resizeHandleProps) {
                            return (
                                <ResizeHandle
                                    direction={direction}
                                    resizeCallback={onResizeStart}
                                    enabled={props.enabled}
                                    resizeEnabled={props.resizeEnabled}
                                    {...props.resizeHandleProps.all}
                                />
                            );
                        } else {
                            return (
                                <ResizeHandle
                                    direction={direction}
                                    resizeCallback={onResizeStart}
                                    enabled={props.enabled}
                                    resizeEnabled={props.resizeEnabled}
                                    {...props.resizeHandleProps[direction]}
                                />
                            );
                        }
                    }
                }}
            </For>
            {props.children}
        </div>
    );
};
