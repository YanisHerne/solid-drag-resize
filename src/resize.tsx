import { mergeProps, ParentComponent, JSX } from "solid-js";
import { DOMElement } from "solid-js/jsx-runtime";

export const directions = [
    "top",
    "right",
    "bottom",
    "left",
    "topRight",
    "bottomRight",
    "bottomLeft",
    "topLeft"
] as const;

export type Direction = typeof directions [number];

const rowStyles = {
    position: "absolute",
    width: "100%",
    height: "15px",
    left: "0px",
    right: "0px",
    "z-index": 1,
} as const;

const colStyles = {
    position: "absolute",
    width: "15px",
    height: "100%",
    top: "0px",
    bottom: "0px",
    "z-index": 1,
} as const;

const cornerStyles = {
    position: "absolute",
    width: "25px",
    height: "25px",
    "z-index": 1,
} as const;

const resizeStyles: { [key in Direction]: JSX.CSSProperties } = {
    top: {
        ...rowStyles,
        top: "-7.5px",
        cursor: "n-resize"
    },
    right: {
        ...colStyles,
        right: "-7.5px",
        cursor: "e-resize"
    },
    bottom: {
        ...rowStyles,
        bottom: "-7.5px",
        cursor: "s-resize"
    },
    left: {
        ...colStyles,
        left: "-7.5px",
        cursor: "w-resize"
    },
    topRight: {
        ...cornerStyles,
        top: "-12.5px",
        right: "-12.5px",
        cursor: "ne-resize"
    },
    bottomRight: {
        ...cornerStyles,
        right: "-12.5px",
        bottom: "-12.5px",
        cursor: "se-resize"
    },
    bottomLeft: {
        ...cornerStyles,
        bottom: "-12.5px",
        left: "-12.5px",
        cursor: "sw-resize"
    },
    topLeft : {
        ...cornerStyles,
        top: "-12.5px",
        left: "-12.5px",
        cursor: "nw-resize"
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
    enabled: boolean,
    resizeEnabled?: boolean,
}

export const ResizeHandle: ParentComponent<ResizeProps> = (props) => {
    const onResize: JSX.EventHandler<HTMLDivElement, MouseEvent> = (event) => {
        props.resizeCallback(event, props.direction)
    }

    return (
        <div
            style = { resizeStyles[props.direction] }
            on:mousedown = { onResize }
            {...props}>
            {props.children}
        </div>
    )
}
