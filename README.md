<p>
  <img width="100%" src="https://assets.solidjs.com/banner?type=solid-drag-resize&background=tiles&project=%20" alt="solid-drag-resize">
</p>

# solid-drag-resize

[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg?style=for-the-badge&logo=pnpm)](https://pnpm.io/)

Simple, flexible library for creating draggable and resizable components in SolidJS. Near feature parity to [react-rnd](https://github.com/bokuweb/react-rnd) and [vue-draggable-resizable](https://github.com/mauricius/vue-draggable-resizable).

If you don't care about resizing, other good dragging libraries for solid are: [@neodrag/solid](https://www.neodrag.dev/docs/solid), [solid-dnd](https://solid-dnd.com/), and [solid-dnd-directive](https://github.com/isaacHagoel/solid-dnd-directive).

## TODO List
* [ ] Fix boundary observer
* [ ] Rework enabled/dragEnabled/resizeEnabled
* [ ] Fix custom resize handles
* [ ] Event delegation instead of tons of listeners
* [ ] Tests
* [ ] Docs

## Quick start

Install it:

```bash
npm i solid-drag-resize
# or
yarn add solid-drag-resize
# or
pnpm add solid-drag-resize
```

Use it:

```tsx
import { DragAndResize } from "solid-drag-resize"
```

## Props
Here are the props options, taken right from the code. Children will be passed through correctly, and any other props will be shallowly merged onto this component. For example, although this library will set the `style` attribute of its main element, you can add and override to it.

    export interface Props {
    /**
     * Defaults to true. The component cannot be dragged or resized when this
     * is false. The component's position and size can still be controlled
     * via the `position` and `state` properties.
     */
    enabled?: boolean;
    /**
     * To enable or disable the dragging functionality without
     * changing the resizing functionality.
     */
    dragEnabled?: boolean;
    /**
     * To enable or disable the resizing functionality without
     * changing the dragging functionality.
     */
    resizeEnabled?: boolean;
    /**
     * A forwarded ref to access to the main element of the component.
     */
    ref?: HTMLDivElement;
    /**
     * Not implemented
     */
    resizeAxes?: {[key in Direction]: boolean};
    /**
     * The size the component starts at before any events fire.
     */
    initialSize?: Size;
    /**
     * The position the component starts at before any events fire.
     */
    initialPosition?: Position;
    /**
     * Changing this prop will directly change the position of the component,
     * though the component's position may be immediately thereafter
     * changed by dragging or resizing events
     */
    position?: Position;
    /**
     * Changing this prop will do a shallow merge of the component's state,
     * that being simply an intersection type of the x and y coordinates
     * with the width and height of the component.
     */
    state?: State;
    /**
     * Resizing will be prevented below this size, though a smaller size
     * may be programmatically set by the `state` prop.
     */
    minSize?: Size;
    /**
     * Resizing will be prevented above this size, though a larger size
     * may be programmatically set by the `state` prop.
     */
    maxSize?: Size;
    /**
     * A variety of ways to describe a drag handle to be used in lieu of
     * the entire element, which is used by default. Events will be bound
     * either directly onto an `HTMLElement` or to one or multiple strings
     * which are query selectors for the elements intended to be handles.
     * One or multiple handles with class "handle" would have querySelectors
     * of `.handle`, while handles with instead an id of "handle" would
     * have querySelectors of `#handle`.
     */
    dragHandle?: HTMLElement | string | string[];
    /**
     * Props to be passed to the eight resize handles. May include children.
     */
    resizeHandleProps?: ParentProps | {[key in Direction]: ParentProps};
    /**
     * When set to `true`, the "user-select" and "-webkit-user-select"
     * properties are set to "none" while dragging or resizing
     * is taking place.
     */
    disableUserSelect?: boolean;
    /**
    * Specifies the boundaries beyond which the element may not be dragged or
    * resized. Bounds are understood as the "top", "right", "bottom", and "left"
    * attributes of an absolutely positioned item with respect to the window.
    * Setting this to "window" will make the window the boundary, setting this
    * to "parent" will use the bounds of the immediate parent of this element
    * as a boundary. You can also input a custom ref to an HTMLElement,
    * specify custom bounds, or specify a function that returns custom bounds.
    */
    boundary?: "window" | "parent" | HTMLElement | Bounds | (() => Bounds);
    /**
     * When true, if the `boundary` prop is set to "window", "parent", or
     * HTMLElement, then any resizing events will be tracked to ensure
     * that this element remains inside the boundary, though the minimum
     * size will still be obeyed.
     */
    ensureInsideBoundary?: boolean;
    /**
    * A class that will be added to the component whenever it is being actively
    * dragged. Essentially a shortcut to manually doing it with dragStart,
    * resizeStart, dragEnd, and resizeEnd.
    */
    classWhileDragging?: string;
    /**
    * A class that will be added to the component whenever it is being actively
    * resized. Essentially a shortcut to manually doing it with dragStart,
    * resizeStart, dragEnd, and resizeEnd.
    */
    classWhileResizing?: string;
    /**
    * A callback that fires whenever a drag motion has begun
    */
    dragStart?: (e: MouseEvent) => void;
    /**
    * A callback that fires continuously on each mouse
    * movement during a drag motion.
    */
    drag?: (e: MouseEvent, offset: Position, state: State) => void;
    /**
    * A callback fires that when the drag movement is done because
    * the mouse has been lifted up
    */
    dragEnd?: (e: MouseEvent, offset: Position, state: State) => void;
    /**
    * A callback that fires whenever a resize motion has begun
    */
    resizeStart?: (e: MouseEvent) => void;
    /**
    * A callback that fires continuously on each mouse
    * movement during a resize motion.
    */
    resize?: ( e: MouseEvent, direction: Direction, action: Action) => void;
    /**
    * A callback fires that when the resize movement is done because
    * the mouse has been lifted up
    */
    resizeEnd?: ( e: MouseEvent, direction: Direction, action: Action) => void;
    [other: string]: unknown;
    }

