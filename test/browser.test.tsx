import { createRoot, createSignal } from 'solid-js'
import { isServer } from 'solid-js/web'
import { render } from '@solidjs/testing-library'
import { describe, expect, it } from 'vitest'
import { page } from '@vitest/browser/context'
import { DragAndResize } from '../src'

describe('environment', () => {
    it('runs on client', () => {
        expect(typeof window).toBe('object')
        expect(isServer).toBe(false)
    })
})

describe('Drag and Resize', () => {

    it('Rendering a component', async () => {
        const { getByText } = render(() => <DragAndResize>Hello World!</DragAndResize>);
        await expect.element(getByText("Hello World!")).toBeInTheDocument();
    })

    it('Changing the component text', async () => {
        const [text, setText] = createSignal('Hello World!')
        const { getByText } = render(() => <DragAndResize>{text()}</DragAndResize>);
        await expect.element(getByText("Hello World!")).toBeInTheDocument();
        setText('Hello Drag and Resize!')

        queueMicrotask(async () => {
            await expect.element(getByText("Hello Drag and Resize!")).toBeInTheDocument();
        })
    })
})
