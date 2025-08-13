import {
    mergeProps,
    createMemo,
    ParentComponent,
    For,
    createSignal,
    createEffect,
    onMount,
    onCleanup,
    JSX,
} from "solid-js";
import { isServer } from "solid-js/web";
import { createStore, unwrap } from "solid-js/store";
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

export type Props = {
    /**
     * Defaults to true. The component cannot be dragged or resized when this
     * is false. The component's position and size can still be
     * programmatically controlled via the `position` and `state` properties.
     * Inputting an object with the keys `drag`, `resize`, separates control of
     * dragging and resizing.
     */
    enabled?:
        | boolean
        | {
              drag: boolean;
              resize: boolean;
          };
    /**
     * A forwarded ref to access to the main element of the component.
     */
    ref?: HTMLElement;
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
     * If you set this prop, only those directions which are set to true will
     * have their resize handles instantiated.
     */
    resizeAxes?: { [key in Direction]?: boolean };
    /**
     * Props to be passed to the eight resize handles.
     */
    resizeHandleProps?:
        | {
              all: { [other: string]: unknown };
          }
        | {
              [key in Direction]: {
                  [other: string]: unknown;
              };
          };
    /**
     * An array of objects containing the direction and DOM element reference
     * for any custom resize handle.
     */
    customResizeHandles?: Array<{
        direction: Direction;
        element: HTMLElement;
    }>;
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
     * custom bounds. Not setting a boundary or setting it to undefined will
     * allow dragging anywhere, even past the edge of the window.
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
    dragStart?: (e: PointerEvent) => void | State;
    /**
     * A callback that fires continuously on each mouse
     * movement during a drag motion.
     */
    drag?: (e: PointerEvent, offset: Position, state: State) => void | State;
    /**
     * A callback fires that when the drag movement is done because
     * the mouse has been lifted up
     */
    dragEnd?: (e: PointerEvent, offset: Position, state: State) => void | State;
    /**
     * A callback that fires whenever a resize motion has begun
     */
    resizeStart?: (e: PointerEvent) => void | State;
    /**
     * A callback that fires continuously on each mouse
     * movement during a resize motion.
     */
    resize?: (e: PointerEvent, direction: Direction, action: Action) => void | State;
    /**
     * A callback fires that when the resize movement is done because
     * the mouse has been lifted up
     */
    resizeEnd?: (e: PointerEvent, direction: Direction, action: Action) => void | State;
    /**
     * Set to false to prevent the component from reacting to its boundary
     * being resized. Otherwise, the component will move itself to remain within
     * the boundaries.
     */
    ensureInside?: boolean;
    /**
     * A callback fires that when the current boundaries are resized. A new
     * state for the component can be optionally returned.
     */
    onEnsureInside?: (action: Action, bounds: Bounds, origin: Position) => void | State;
    [other: string]: unknown;
};

export type DragAndResizeProps = {
    [K in keyof Props]: Props[K];
} & {};

export const defaultProps = {
    enabled: true,
    disableUserSelect: true,
};

export const DragAndResize: ParentComponent<Props> = (unmergedProps) => {
    const props = mergeProps(defaultProps, unmergedProps);
    let mainElement: HTMLDivElement | undefined;
    const [state, setState] = createStore<State>(defaultState);

    onMount(() => {
        if (props.initialState) setState(props.initialState);
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
    createEffect(() => {
        // ResizeObserver cannot be SSR-ed since it is a browser only API
        observer = new ResizeObserver(() => {
            if (props.ensureInside === false) return;
            origin = {
                x: mainElement!.getBoundingClientRect().left - state.x,
                y: mainElement!.getBoundingClientRect().top - state.y,
            };
            calculateBounds();
            if (!bounds) return;
            action.init = unwrap(state);
            action.proposed = action.init;
            action.amended.x = clamp(
                action.proposed.x,
                bounds.left - origin.x,
                window.innerWidth - action.proposed.width - bounds.right - origin.x,
            );
            action.amended.y = clamp(
                action.proposed.y,
                bounds.top - origin.y,
                window.innerHeight - action.proposed.height - bounds.bottom - origin.y,
            );
            if (props.onEnsureInside) {
                const result = props.onEnsureInside(action, bounds, origin);
                if (isState(result)) action.amended = result;
            }
            setState({
                x: action.amended.x,
                y: action.amended.y,
            });
        });
        onCleanup(() => {
            observer.disconnect();
        });
    });
    let nowObserving: Element;
    createEffect(() => {
        let boundaryElement: Element | undefined = undefined;
        if (props.boundary === "parent") {
            boundaryElement = mainElement!.parentElement!;
        } else if (props.boundary === "window") {
            boundaryElement = document.body;
        } else if (props.boundary instanceof HTMLElement) {
            boundaryElement = props.boundary;
        } else {
            observer.disconnect();
        }
        if (boundaryElement && boundaryElement !== nowObserving) {
            observer.disconnect();
            observer.observe(boundaryElement);
            nowObserving = boundaryElement;
        }
    });
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
        } else if (props.boundary === "window") {
            bounds = {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
            };
        } else if (props.boundary instanceof HTMLElement) {
            const rect = props.boundary.getBoundingClientRect();
            bounds = {
                top: rect.top,
                right: window.innerWidth - rect.right,
                bottom: window.innerHeight - rect.bottom,
                left: rect.left,
            };
        } else if (typeof props.boundary === "function") {
            bounds = props.boundary();
        } else if (typeof props.boundary === "object") {
            bounds = props.boundary;
        } else {
            bounds = undefined;
        }
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
        const amended = proposed;
        if (!bounds) return amended;
        amended.x = clamp(
            proposed.x,
            bounds.left,
            window.innerWidth - proposed.width - bounds.right,
        );
        amended.y = clamp(
            proposed.y,
            bounds.top,
            window.innerHeight - proposed.height - bounds.bottom,
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
        action.amended.x -= origin.x;
        action.amended.y -= origin.y;
        if (props.drag) {
            const result = props.drag(e, offset, state);
            if (isState(result)) action.amended = result;
        }
        setState({ x: action.amended.x, y: action.amended.y });
    };
    const onDragEnd = (e: PointerEvent | undefined = undefined) => {
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

    // solid-js wants to track this, so needs to be in a memo
    const noDragging = createMemo(
        () => !props.enabled || (typeof props.enabled === "object" && props.enabled.drag === false),
    );

    const onDragStart = (e: PointerEvent) => {
        if (e.button > 1 || !mainElement || noDragging()) return;
        if (resizing()) {
            onDragEnd(); // When resizing, don't drag
            // This will be fixed with event delegation
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

    // solid-js wants to track this, so needs to be in a memo
    const noResizing = createMemo(
        () =>
            !props.enabled || (typeof props.enabled === "object" && props.enabled.resize === false),
    );

    const onResizeStart: ResizeCallback = (e, dir) => {
        if (
            e.button > 1 ||
            !mainElement ||
            noResizing() ||
            (props.resizeAxes && props.resizeAxes[dir] === false)
        )
            return;
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
        if (props.resizeStart) props.resizeStart(e);
    };

    const handles: HTMLElement[] = [];
    createEffect(() => {
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
            // If an array of handles & css selectors
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
        handles.forEach((el) => el.addEventListener("pointerdown", onDragStart));
        onCleanup(() =>
            handles.forEach((el) => el.removeEventListener("pointerdown", onDragStart)),
        );
    });

    // Custom resize handles
    let resizeHandles: Array<{
        direction: Direction;
        element: HTMLElement;
        listener: (e: PointerEvent) => void;
    }> = [];

    // Closure to capture direction to store correct callback
    const binder = (args: Direction) => {
        return (e: PointerEvent) => onResizeStart(e, args);
    };
    createEffect(() => {
        if (!props.customResizeHandles) return;
        resizeHandles.forEach((handle) => {
            handle.element.removeEventListener("pointerdown", handle.listener);
        });
        resizeHandles.length = 0;
        props.customResizeHandles.forEach((handle) => {
            const listener = binder(handle.direction);
            handle.element.addEventListener("pointerdown", listener);
            resizeHandles.push({
                direction: handle.direction,
                element: handle.element,
                listener: listener,
            });
        });
        onCleanup(() =>
            resizeHandles.forEach((handle) =>
                handle.element.removeEventListener("pointerdown", handle.listener),
            ),
        );
    });

    onCleanup(() => {
        if (!isServer) {
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
                        translate: state.x + "px " + state.y + "px",
                        height: state.height + "px",
                        width: state.width + "px",
                        "user-select": userSelect() ? "auto" : "none",
                        "-webkit-user-select": userSelect() ? "auto" : "none",
                        "touch-action": "none",
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
                    let otherProps: any = undefined;
                    if (props.resizeHandleProps) {
                        if ("all" in props.resizeHandleProps) {
                            otherProps = props.resizeHandleProps.all;
                        } else {
                            otherProps = props.resizeHandleProps[direction];
                        }
                    }
                    return (
                        <ResizeHandle
                            direction={direction}
                            resizeCallback={onResizeStart}
                            enabled={props.enabled}
                            resizeAxes={props.resizeAxes}
                            {...otherProps}
                        />
                    );
                }}
            </For>
            {props.children}
        </div>
    );
};
