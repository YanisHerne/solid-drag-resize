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
            <DragAndResize
                class={styles.DragAndResize}
                styles={{ background: "grey" }}
                enabled={enabled()}
                dragEnabled={dragEnabled()}
                resizeEnabled={resizeEnabled()}
                position={position()}
                state={state()}
                classWhileDragging="currentlyDragging"
                classWhileResizing="currentlyResizing"
            />
        </div>
    );
};

export default App;
