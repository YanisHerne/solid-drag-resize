import type { Component } from "solid-js";
import { createSignal } from "solid-js"
import logo from "./logo.svg";
import styles from "./App.module.css";
import { DragAndResize, Position, State, DefaultState } from "src";

const App: Component = () => {
    const [enabled, setEnabled] = createSignal<boolean>(true);

    const [dragEnabled, setDragEnabled] = createSignal<boolean>(true);
    const [resizeEnabled, setResizeEnabled] = createSignal<boolean>(true);
    const [position, setPosition] = createSignal<Position>({x:0,y:0});
    const [state, setState] = createSignal<State>(DefaultState);
    const [handleEnabled, setHandleEnabled] = createSignal<boolean>(false);

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
            <DragAndResize
                class={styles.DragAndResize}
                style={{ "border-radius": "0.5rem" }}
                enabled={enabled()}
                dragEnabled={dragEnabled()}
                resizeEnabled={resizeEnabled()}
                initialPosition={{x: 10, y: 10}}
                initialSize={{width: 150, height: 150}}
                maxSize={{width: 500, height: 500}}
                position={position()}
                state={state()}
                boundary={{top: 20, left: 20, right: 20, bottom: 20}}
                dragHandle={handleEnabled() ? ".handle" : undefined}
                classWhileDragging="currentlyDragging"
                classWhileResizing="currentlyResizing"
                dragStart={(e) => {
                    console.log("Drag started, parameter below:");
                    console.log({event: e});
                }}
                drag={(e, offset, state) => {
                    console.log("Dragging, parameters below:");
                    console.log({event: e, offset: offset, state: state});
                }}
                dragEnd={(e, offset, state) => {
                    console.log("Drag ended, parameters below:")
                    console.log({event: e, offset: offset, state: state});
                }}
                resizeStart={(e) => {
                    console.log("Resize started, parameter below")
                    console.log({event: e});
                }}
                resize={(e, dir, resizeData, state) => {
                    console.log("Resizing");
                    console.log({
                        event: e,
                        direction: dir,
                        resizeData: resizeData,
                        state: state
                    });
                }}
                resizeEnd={(e, dir, resizeData, state) => {
                    console.log("Resize ended");
                    console.log({
                        event: e,
                        direction: dir,
                        resizeData: resizeData,
                        state: state
                    });
                }}
            >
                <div class={styles.DragHandle} classList={{"handle": true}} />
            </DragAndResize>
        </div>
    );
};

export default App;
