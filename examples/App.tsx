import type { Component } from "solid-js";
import { createSignal, createMemo } from "solid-js";
import styles from "./App.module.css";
import { DragAndResize, Position, State, defaultState } from "src";

const App: Component = () => {
    const [enabled, setEnabled] = createSignal<boolean>(true);
    const [separateEnabling, setSeparateEnabling] = createSignal<boolean>(false);
    const [dragEnabled, setDragEnabled] = createSignal<boolean>(true);
    const [resizeEnabled, setResizeEnabled] = createSignal<boolean>(true);
    const [position, setPosition] = createSignal<Position>();
    const [state, setState] = createSignal<State>(defaultState);
    const [handleEnabled, setHandleEnabled] = createSignal<boolean>(false);
    let reference: HTMLElement | undefined = undefined;
    const [boundaries, setBoundaries] = createSignal<boolean>(true);
    const [userSelect, setUserSelect] = createSignal<boolean>(true);
    const [className, setClassName] = createSignal<"" | "draggable">("draggable");
    createMemo(() => {
        if (handleEnabled()) {
            setClassName("");
        } else {
            setClassName("draggable");
        }
    });
    const [rightHandlesOnly, setRightHandlesOnly] = createSignal<boolean>(true);

    return (
        <div class={styles.App}>
            <button onClick={() => setEnabled(!enabled())}>
                Click to {enabled() ? "disable" : "enable"} overall
            </button>
            <button onClick={() => setSeparateEnabling(!separateEnabling())}>
                Click to {separateEnabling() ? "unseparate" : "separate"} enable/disable functions
                for drag/resize
            </button>
            <button onClick={() => setDragEnabled(!dragEnabled())}>
                Click to {dragEnabled() ? "disable" : "enable"} drag
            </button>
            <button onClick={() => setResizeEnabled(!resizeEnabled())}>
                Click to {resizeEnabled() ? "disable" : "enable"} resize
            </button>
            <button
                onClick={() =>
                    setPosition({
                        x: 150,
                        y: 200,
                    })
                }
            >
                Click to jump to (150, 200)
            </button>
            <button
                onClick={() =>
                    setState({
                        x: 100,
                        y: 100,
                        width: 100,
                        height: 100,
                    })
                }
            >
                Click to jump to (100, 100) with size (100, 100)
            </button>
            <button onClick={() => setHandleEnabled(!handleEnabled())}>
                Click to {handleEnabled() ? "disable" : "enable"} the drag handle
            </button>
            <button onClick={() => console.log(reference)}>Click to console log element ref</button>
            <button onClick={() => setBoundaries(!boundaries())}>
                Click to toggle parent/window boundaries
            </button>
            <button onClick={() => setUserSelect(!userSelect())}>
                Click to {userSelect() ? "disable" : "enable"} user select: none when moving
            </button>
            <button onClick={() => setRightHandlesOnly(!rightHandlesOnly())}>
                Click to enable {rightHandlesOnly() ? "only the right handle resize handles" : "all of the resize handles"}
            </button>
            <DragAndResize
                class={styles.DragAndResize + " " + className()}
                style={{
                    "border-radius": "0.5rem",
                }}
                ref={reference}
                enabled={
                    separateEnabling()
                        ? {
                            drag: dragEnabled(),
                            resize: resizeEnabled(),
                        }
                        : enabled()
                }
                disableUserSelect={userSelect()}
                initialState={{ x: 10, y: 10, width: 150, height: 150 }}
                minSize={{ width: 80, height: 80 }}
                maxSize={{ width: 500, height: 500 }}
                position={position()}
                state={state()}
                boundary={
                    boundaries()
                        ? "window"
                        : "parent" /*{top: 20, left: 20, right: 20, bottom: 20}*/
                }
                dragHandle={handleEnabled() ? ".handle" : undefined}
                classWhileDragging="currentlyDragging"
                classWhileResizing="currentlyResizing"
                dragStart={(e) => {
                    console.log("Drag started parameters:");
                    console.log({ event: e });
                }}
                drag={(e, offset, state) => {
                    console.log("Drag parameters:");
                    console.log({ event: e, offset: offset, state: state });
                }}
                dragEnd={(e, offset, state) => {
                    console.log("Drag ended parameters");
                    console.log({ event: e, offset: offset, state: state });
                }}
                resizeStart={(e) => {
                    console.log("Resize started parameters:");
                    console.log({ event: e });
                }}
                resize={(e, dir, action) => {
                    console.log("Resize parameters:");
                    console.log({ event: e, direction: dir, action: action });
                }}
                resizeEnd={(e, dir, action) => {
                    console.log("Resize ended parameters:");
                    console.log({ event: e, direction: dir, action: action });
                }}
                id="DragAndResize"
                resizeAxes={
                    rightHandlesOnly()
                        ? undefined
                        : {
                              topRight: true,
                              right: true,
                              bottomRight: true,
                          }
                }
                resizeHandleProps={{
                    all: {
                        className: "thing",
                    },
                }}
                customResizeHandles={[
                    {
                        direction: "right",
                        element: document.getElementById("custom-handle-right")!,
                    },
                ]}
            >
                <div class={styles.DragHandle} classList={{ handle: true }} />
                <div id="custom-handle-right" />
            </DragAndResize>
        </div>
    );
};

export default App;
