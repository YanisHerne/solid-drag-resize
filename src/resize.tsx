import { mergeProps, Component, JSX } from "solid-js";
import { DOMElement } from "solid-js/jsx-runtime";

export const ResizeDirections = [
    "top",
    "right",
    "bottom",
    "left",
    "topRight",
    "bottomRight",
    "bottomLeft",
    "topLeft"
] as const;

export type Direction = typeof ResizeDirections[number];

export enum DirectionMap {
    top = "n",
    right = "e",
    bottom = "s",
    left = "w",
    topRight = "ne",
    bottomRight = "se",
    bottomLeft = "sw",
    topLeft = "nw",
}

const rowStyles = {
    position: "absolute",
    width: "100%",
    height: "10px",
    left: "0px",
    right: "0px",
    "z-index": 1,
} as const;

const colStyles = {
    position: "absolute",
    width: "10px",
    height: "100%",
    top: "0px",
    bottom: "0px",
    "z-index": 1,
} as const;

const cornerStyles = {
    position: "absolute",
    width: "20px",
    height: "20px",
    "z-index": 1,
} as const;

const resizeStyles: { [key in Direction]: JSX.CSSProperties } = {
    top: {
        ...rowStyles,
        top: "-5px",
        cursor: DirectionMap.top + "-resize"
    },
    right: {
        ...colStyles,
        right: "-5px",
        cursor: DirectionMap.right + "-resize"
    },
    bottom: {
        ...rowStyles,
        bottom: "-5px",
        cursor: DirectionMap.bottom + "-resize"
    },
    left: {
        ...colStyles,
        left: "-5px",
        cursor: DirectionMap.left + "-resize"
    },
    topRight: {
        ...cornerStyles,
        top: "-10px",
        right: "-10px",
        cursor: DirectionMap.topRight + "-resize"
    },
    bottomRight: {
        ...cornerStyles,
        right: "-10px",
        bottom: "-10px",
        cursor: DirectionMap.bottomRight + "-resize"
    },
    bottomLeft: {
        ...cornerStyles,
        bottom: "-10px",
        left: "-10px",
        cursor: DirectionMap.bottomLeft + "-resize"
    },
    topLeft : {
        ...cornerStyles,
        top: "-10px",
        left: "-10px",
        cursor: DirectionMap.topLeft + "-resize"
    },
} as const

export type ResizeCallback = (
    e: MouseEvent & {
        currentTarget: HTMLDivElement;
        target: DOMElement;
    },
    direction: Direction
) => void;

interface ResizeProps {
    direction: Direction,
    resizeCallback: ResizeCallback,
}

export const ResizeHandle: Component<ResizeProps> = (unmergedProps) => {
    const props = mergeProps({enabled: true}, unmergedProps);
    const onResize: JSX.EventHandler<HTMLDivElement, MouseEvent> = (event) => {
        props.resizeCallback(event, props.direction)
    }

    return (
        <div
            style = { resizeStyles[props.direction] }
            onclick = { onResize }
            {...props}>
        </div>
    )
}
