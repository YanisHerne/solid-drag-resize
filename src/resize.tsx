import { createSignal, createMemo, ParentComponent, JSX } from "solid-js";
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
    },
    right: {
        ...colStyles,
        right: "-7.5px",
    },
    bottom: {
        ...rowStyles,
        bottom: "-7.5px",
    },
    left: {
        ...colStyles,
        left: "-7.5px",
    },
    topRight: {
        ...cornerStyles,
        top: "-12.5px",
        right: "-12.5px",
    },
    bottomRight: {
        ...cornerStyles,
        right: "-12.5px",
        bottom: "-12.5px",
    },
    bottomLeft: {
        ...cornerStyles,
        bottom: "-12.5px",
        left: "-12.5px",
    },
    topLeft : {
        ...cornerStyles,
        top: "-12.5px",
        left: "-12.5px",
    },
} as const

const cursorStyles = {
    top: "n-resize",
    right: "e-resize",
    bottom: "s-resize",
    left: "w-resize",
    topRight: "ne-resize",
    bottomRight: "se-resize",
    bottomLeft: "sw-resize",
    topLeft: "nw-resize",
} as const;

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

    // Band-aid solution for cursor changes
    const [enabled, setEnabled] = createSignal<boolean>(true);
    createMemo(() => {
        if (!props.enabled || props.resizeEnabled === false) {
            setEnabled(false);
        } else {
            setEnabled(true);
        }
    });

    return (
        <div
            style={Object.assign(
                resizeStyles[props.direction],
                {
                    cursor: enabled() ? cursorStyles[props.direction] : "unset",
                },
            )}
            on:mousedown = { onResize }
            {...props}
        >
            {props.children}
        </div>
    )
}
