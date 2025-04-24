import {
    Accessor,
    mergeProps,
    splitProps,
    ParentComponent,
    Component,
    For,
    JSX,
    createSignal,
    createMemo,
} from "solid-js";
import { createStore, produce } from "solid-js/store"
import {
    ResizeDirections,
    Direction,
    ResizeCallback,
    ResizeHandle,
    DirectionMap,
} from "./resize";
import { createSign } from "node:crypto";

type RequireAtLeastTwo<T, Keys extends keyof T = keyof T> =
    Pick<T, Exclude<keyof T, Keys>> &
    ({ [K1 in Keys]: Required<Pick<T, K1>> &
        { [K2 in Exclude<Keys, K1>]: Required<Pick<T, K2>> &
            Partial<Pick<T, Exclude<Keys, K1 | K2>>>
        }[Exclude<Keys, K1>]
    }[Keys]);

type Position = {
    x: number;
    y: number;
}

const isPosition = (obj: any): obj is Position=> {
    return (
        typeof obj === "object" &&
        obj !== null &&
        typeof obj.x === "number" &&
        typeof obj.y === "number"
    )
}

type Bounds = {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

type Size = {
    height: number;
    width: number;
}

const DefaultState: State = {
    x: 0,
    y: 0,
    height: 100,
    width: 100,
}

type State = Position & Size;

const isState = (obj: any): obj is State => {
    return (
        obj.height === "number" &&
        obj.width === "number" &&
        isPosition(obj)
    )
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
    enabled?: boolean;
    defaultSize?: Size;
    defaultPosition?: Position;
    minSize?: Size;
    maxSize?: Size;
    [other: string]: unknown;
}

export const defaultProps: Props = {
    enabled: true,
}

export const DragAndResize: ParentComponent<Props> = (unmergedProps) => {
    const props = mergeProps({enabled: true}, unmergedProps);

    let mainElement: HTMLDivElement | undefined;
    let dragHandle: string | HTMLElement | undefined;
    const [state, setState] = createState();

    const [offset, setOffset] = createSignal<Position>();
    const onDragMove = (e: MouseEvent) => {
        if (direction()) onDragEnd() // When resizing, don't drag
        mainElement!.style.cursor = "grabbing";
        const dragOffset: { x: number; y: number; } = offset()!;
        const dragX = Math.min(
            Math.max(e.clientX - dragOffset.x, 0),
            window.innerWidth - state.width
        );
        const dragY = Math.min(
            Math.max(e.clientY - dragOffset.y, 0),
            window.innerHeight - state.height
        );
        console.log("(" + dragX + ", " + dragY + ")");
        setState({x: dragX, y: dragY});
    }
    const onDragEnd = (_e: MouseEvent | undefined = undefined) => {
        mainElement!.style.cursor = "grab";
        document.removeEventListener("mousemove", onDragMove);
        document.removeEventListener("mouseup", onDragEnd);
    }
    const onDragStart = (e: MouseEvent) => {
        if (!props.enabled) return
        if (direction()) onDragEnd() // When resizing, don't drag
        mainElement!.style.cursor = "grabbing";
        setOffset({
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
    const onResizeEnd = (_e: MouseEvent) => {
        setDirection(undefined);
        document.removeEventListener("mousemove", onResizeMove);
        document.removeEventListener("mouseup", onResizeEnd);
    };
    const onResizeStart: ResizeCallback = (e, direction) => {
        if (!props.enabled) return
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
            ref={mainElement}
            style={{
                position: "absolute",
                top: state.y + "px",
                left: state.x + "px",
                height: state.height + "px",
                width: state.width + "px"
            }}
            on:mousedown={onDragStart}
            {...props}>
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
