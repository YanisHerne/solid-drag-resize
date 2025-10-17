import { Show, createMemo, ParentComponent, JSX } from "solid-js";

export const directions = [
    "top",
    "right",
    "bottom",
    "left",
    "topRight",
    "bottomRight",
    "bottomLeft",
    "topLeft",
] as const;

export type Direction = (typeof directions)[number];

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
    topLeft: {
        ...cornerStyles,
        top: "-12.5px",
        left: "-12.5px",
    },
} as const;

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

export type ResizeCallback = (e: PointerEvent, direction: Direction) => void;

interface ResizeProps {
    direction: Direction;
    resizeCallback: ResizeCallback;
    enabled?:
        | boolean
        | {
              drag: boolean;
              resize: boolean;
          };
    resizeAxes?: { [key in Direction]?: boolean };
}

export const ResizeHandle: ParentComponent<ResizeProps & Record<string, unknown>> = (props) => {
    let ref!: HTMLDivElement;
    const onResize: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
        props.resizeCallback(event, props.direction);
        ref.setPointerCapture(event.pointerId)
    };

    const enabled = createMemo(() => {
        return !(
            !props.enabled ||
            (typeof props.enabled === "object" && props.enabled.resize === false)
        );
    });
    const rendered = createMemo(() => {
        return (
            props.resizeAxes === undefined ||
            (props.resizeAxes && props.resizeAxes[props.direction] === true)
        );
    });

    return (
        <Show when={rendered()}>
            <div
                ref={ref}
                style={Object.assign(resizeStyles[props.direction], {
                    cursor: enabled() ? cursorStyles[props.direction] : "unset",
                })}
                on:pointerdown={onResize}
                {...props}
            >
                {props.children}
            </div>
        </Show>
    );
};
