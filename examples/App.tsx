import type { Component } from "solid-js";
import { createSignal, createMemo } from "solid-js"
import logo from "./logo.svg";
import styles from "./App.module.css";
import { DragAndResize, Position, State, defaultState } from "src";

const App: Component = () => {
    const [enabled, setEnabled] = createSignal<boolean>(true);

    const [dragEnabled, setDragEnabled] = createSignal<boolean>(true);
    const [resizeEnabled, setResizeEnabled] = createSignal<boolean>(true);
    const [position, setPosition] = createSignal<Position>();
    const [state, setState] = createSignal<State>(defaultState);
    const [handleEnabled, setHandleEnabled] = createSignal<boolean>(false);
    let reference: HTMLElement | undefined = undefined;
    const [boundaries, setBoundaries] = createSignal<boolean>(true);
    const [userSelect, setUserSelect] = createSignal<boolean>(true);
    const [className, setClassName] = createSignal<""|"draggable">("draggable");
    createMemo(() => {
        if (handleEnabled()) {
            setClassName("");
        } else {
            setClassName("draggable");
        }
    });

    return (
        <div class={styles.App}>
            <button onclick={() => setEnabled(!enabled())}>
                Click to {enabled() ? "disable" : "enable"} overall
            </button>
            <button onclick={() => setDragEnabled(!dragEnabled())}>
                Click to {dragEnabled() ? "disable" : "enable"} drag
            </button>
            <button onclick={() => setResizeEnabled(!resizeEnabled())}>
                Click to {resizeEnabled() ? "disable" : "enable"} resize
            </button>
            <button onclick={() => setPosition({
                x: 150,
                y: 200,
            })}>
                Click to jump to (150, 200)
            </button>
            <button onclick={() => setState({
                x: 100,
                y: 100,
                width: 100,
                height: 100,
            })}>
                Click to jump to (100, 100) with size (100, 100)
            </button>
            <button onclick={() => setHandleEnabled(!handleEnabled())}>
                Click to {handleEnabled() ? "disable" : "enable"} the drag handle
            </button>
            <button onclick={() => console.log(reference)}>
                Click to console log element ref
            </button>
            <button onclick={() => setBoundaries(!boundaries())}>
                Click to toggle parent/window boundaries
            </button>
            <button onclick={() => setUserSelect(!userSelect())}>
                Click to {userSelect() ? "disable" : "enable"} user select: none when moving
            </button>
            <DragAndResize
                class={styles.DragAndResize + " " + className()}
                style={{ "border-radius": "0.5rem" }}
                ref={reference}
                enabled={enabled()}
                dragEnabled={dragEnabled()}
                resizeEnabled={resizeEnabled()}
                disableUserSelect={userSelect()}
                initialPosition={{x: 10, y: 10}}
                initialSize={{width: 150, height: 150}}
                maxSize={{width: 500, height: 500}}
                position={position()}
                state={state()}
                boundary={boundaries() ? "window" : "parent"/*{top: 20, left: 20, right: 20, bottom: 20}*/}
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
                    console.log("Drag ended parameters")
                    console.log({ event: e, offset: offset, state: state });
                }}
                resizeStart={(e) => {
                    console.log("Resize started parameters:")
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
            >
                <div class={styles.DragHandle} classList={{"handle": true}} />
            </DragAndResize>
        </div>
    );
};

export default App;
