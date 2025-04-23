import type { Component } from "solid-js";
import logo from "./logo.svg";
import styles from "./App.module.css";
import { DragAndResize } from "src";

const App: Component = () => {
    return (
        <div class={styles.App}>
            <DragAndResize class={styles.DragAndResize} enabled={true} />
        </div>
    );
};

export default App;
