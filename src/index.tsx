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
[ get: State, (to: State | Position) => void ] => {
    const [state, setState] = createStore<State>(defaultState);
    const update =(to: State | Position) => {
        setState(
            produce((prevState) => {
                prevState.x = to.x;
                prevState.y = to.y;
                if (isState(to)) {
                    prevState.height = to.height;
                    prevState.width = to.width;
                }
            })
        );
    };
    return [state, update];
}

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

type PropsKeys = keyof Props;

export const DragAndResize: ParentComponent<Props> = (unmergedProps) => {
    const props = mergeProps({enabled: true}, unmergedProps);
    /*
    const propsKeysArr: PropsKeys[] = [
        "enabled",
        "defaultSize",
        "defaultPosition",
        "minSize",
        "maxSize"
    ];
    const [localProps, otherProps] = splitProps(mergedProps, propsKeysArr);
    */

    let mainElement: HTMLDivElement | undefined;
    let dragHandle: string | HTMLElement | undefined;
    const [state, setState] = createState();

    const [offset, setOffset] = createSignal<Position>();
    const onDragMove = (e: MouseEvent) => {
        mainElement!.style.cursor = "grabbing";
        const dragOffset: { x: number; y: number; } = offset()!;
        const dragX = Math.min(Math.max(e.clientX - dragOffset.x, 0), window.innerWidth);
        const dragY = Math.min(Math.max(e.clientY - dragOffset.y, 0), window.innerHeight)
        setState({x: dragX, y: dragY});
    }
    const onDragEnd = (_e: MouseEvent) => {
        mainElement!.style.cursor = "grab";
        document.removeEventListener("mousemove", onDragMove);
        document.removeEventListener("mouseup", onDragEnd);
    }
    const onDragStart = (e: MouseEvent) => {
        if (!props.enabled) return
        mainElement!.style.cursor = "grabbing";
        setOffset({
            x: e.clientX - mainElement!.getBoundingClientRect().left,
            y: e.clientY - mainElement!.getBoundingClientRect().top
        });
        document.addEventListener("mousemove", onDragMove);
        document.addEventListener("mouseup", onDragEnd);
    }

    const onResizeMove = (e: MouseEvent) => {
        return;
    }
    const onResizeEnd = (e: MouseEvent) => {
        return;
    };
    const onResizeStart: ResizeCallback = (event, direction) => {
        event.currentTarget.style.cursor = DirectionMap[direction] + "-resize";
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
