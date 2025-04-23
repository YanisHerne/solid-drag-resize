import {
    Accessor,
    mergeProps,
    splitProps,
    ParentComponent,
    Component,
    createComputed,
    createSignal,
    createMemo
} from "solid-js";

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

const Origin: Position = {
    x: 0,
    y: 0
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

const createPosition = (defaultOffset: Position = Origin):
        [ Accessor<Position>, (to: Position) => void ] => {
    const [offset, setOffset] = createSignal<Position>(defaultOffset);
    return [offset, (to: Position) => setOffset(to)];
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
    let dragHandle: HTMLElement | undefined;

    const [offset, setOffset] = createSignal<Position>();
    const [position, setPosition] = createPosition();
    const onDragMove = (e: MouseEvent) => {
        mainElement!.style.cursor = "grabbing";
        const dragOffset: { x: number; y: number; } = offset()!;
        const dragX = Math.min(Math.max(e.clientX - dragOffset.x, 0), window.innerWidth);
        const dragY = Math.min(Math.max(e.clientY - dragOffset.y, 0), window.innerHeight)
        console.log(position())
        setPosition({x: dragX, y: dragY});
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

    return (
        <div
            ref={mainElement}
            style={{
                position: "absolute",
                top: position().y + "px",
                left: position().x + "px",
            }}
            on:mousedown={onDragStart}
            {...props}>
            { props.children }
        </div>
    )
}
