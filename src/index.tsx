import {
    mergeProps,
    ParentComponent,
    ParentProps,
    Component,
    For,
    JSX,
    createSignal,
    createEffect,
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
    enabled: boolean;
    dragEnabled?: boolean;
    resizeEnabled?: boolean;
    resizeAxes?: {[key in Direction]: boolean};
    initialSize?: Size;
    initialPosition?: Position;
    position?: Position;
    state?: State;
    minSize?: Size;
    maxSize?: Size;
    dragHandle?: Component | HTMLElement | string | string[];
    resizeHandleProps?: ParentProps | {[key in Direction]: ParentProps};
    disableUserSelect?: boolean;
    boundary?: "window" | "parent" | HTMLElement | (() => Bounds);
    classWhileDragging?: string;
    classWhileResizing?: string;
    dragStart?: (e: MouseEvent) => void;
    drag?: (e: MouseEvent, offset: Position, state: State) => void;
    dragEnd?: (e: MouseEvent, offset: Position, state: State) => void;
    resizeStart?: (e: MouseEvent) => void;
    resize?: (
        e: MouseEvent,
        direction: Direction,
        resizeData: ResizeData,
        state: State
    ) => void;
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
    disableUserSelect: true
}

export const DragAndResize: ParentComponent<Props> = (unmergedProps) => {
    const props = mergeProps(defaultProps, unmergedProps);
    let mainElement: HTMLDivElement | undefined;
    let dragHandle: HTMLElement | undefined;
    const [state, setState] = createState();

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
    createEffect(() => { if(props.position) setState(props.position); });
    createEffect(() => { if(props.state) setState(props.state); });

    const [userSelect, setUserSelect] = createSignal<"unset"|"none"|"all">("unset");

    const [dragging, setDragging] = createSignal<boolean>(false);
    const [dragOffset, setDragOffset] = createSignal<Position>();
    const onDragMove = (e: MouseEvent) => {
        if (direction()) onDragEnd() // When resizing, don't drag
        mainElement!.style.cursor = "grabbing";
        const offset: { x: number; y: number; } = dragOffset()!;
        const dragX = Math.min(
            Math.max(e.clientX - offset.x, 0),
            window.innerWidth - state.width
        );
        const dragY = Math.min(
            Math.max(e.clientY - offset.y, 0),
            window.innerHeight - state.height
        );
        setState({x: dragX, y: dragY});
    }
    const onDragEnd = (_e: MouseEvent | undefined = undefined) => {
        setDragging(false);
        mainElement!.style.cursor = "grab";
        document.removeEventListener("mousemove", onDragMove);
        document.removeEventListener("mouseup", onDragEnd);
        if (props.disableUserSelect) setUserSelect("unset");
    }
    const onDragStart = (e: MouseEvent) => {
        setDragging(true);
        if (!props.enabled || props.dragEnabled === false) return;
        if (direction()) onDragEnd(); // When resizing, don't drag
        if (props.disableUserSelect) setUserSelect("none");
        mainElement!.style.cursor = "grabbing";
        setDragOffset({
            x: e.clientX - mainElement!.getBoundingClientRect().left,
            y: e.clientY - mainElement!.getBoundingClientRect().top
        });
        document.addEventListener("mousemove", onDragMove);
        document.addEventListener("mouseup", onDragEnd);
    }

    const [resizing, setResizing] = createSignal<boolean>(false);
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
        switch(direction()) {
            case "top":
                setState({
                    y: newY,
                    height: offset.height - deltaY,
                });
                break;
            case "right":
                setState({
                    x: offset.x,
                    width: offset.width + deltaX,
                });
                break;
            case "bottom":
                setState({
                    y: offset.y,
                    height: offset.height + deltaY,
                });
                break;
            case "left":
                setState({
                    x: newX,
                    width: offset.width - deltaX,
                });
                break;
            case "topRight":
                setState({
                    y: newY,
                    x: offset.x,
                    height: offset.height - deltaY,
                    width: offset.width + deltaX,
                });
                break;
            case "bottomRight":
                setState({
                    y: offset.y,
                    x: offset.x,
                    height: offset.height + deltaY,
                    width: offset.width + deltaX,
                });
                break;
            case "bottomLeft":
                setState({
                    y: offset.y,
                    x: newX,
                    height: offset.height + deltaY,
                    width: offset.width - deltaX,
                });
                break;
            case "topLeft":
                setState({
                    y: newY,
                    x: newX,
                    height: offset.height - deltaY,
                    width: offset.width - deltaX,
                });
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

    return (
        <div
            {...props}
            ref={mainElement}
            style={{
                position: "absolute",
                top: state.y + "px",
                left: state.x + "px",
                height: state.height + "px",
                width: state.width + "px",
                "user-select": userSelect(),
                "-webkit-user-select": userSelect(),
            }}
            classList={{
                [props.classWhileDragging!]: dragging(),
                [props.classWhileResizing!]: resizing(),
            }}
            on:mousedown={onDragStart}>
            <For each={ResizeDirections}>
                {(direction) => {
                    return (<ResizeHandle
                        direction={direction}
                        resizeCallback={onResizeStart}/>
                    )
                }}
            </For>
            { props.children }
        </div>
    );
}
