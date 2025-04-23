import type { Component } from "solid-js";
import { createSignal } from "solid-js"
import logo from "./logo.svg";
import styles from "./App.module.css";
import { DragAndResize } from "src";

const App: Component = () => {
    const [enabled, setEnabled] = createSignal<boolean>(true);

    return (
        <div class={styles.App}>
            <button onclick={() => setEnabled(!enabled())}>
                Click to {enabled() ? "disable" : "enable"} dragging
            </button>
            <DragAndResize class={styles.DragAndResize} enabled={enabled()} />
        </div>
    );
};

export default App;
