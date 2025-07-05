import { createRoot, createSignal } from 'solid-js'
import { isServer } from 'solid-js/web'
import { describe, expect, it } from 'vitest'
import { render } from '@solidjs/testing-library'
import { DragAndResize } from '../src'

describe('environment', () => {
    it('runs on client', () => {
        expect(typeof window).toBe('object')
        expect(isServer).toBe(false)
    })
})

describe('Drag and Resize', () => {

    it('Rendering a component', async () => {
        const { getByText }= render(() => <DragAndResize>Hello World!</DragAndResize>);
        await expect.element(getByText("Hello World!")).toBeInTheDocument();
    })

    it('Changing the component text', () => {
        createRoot((dispose) => {
            const [text, setText] = createSignal('Solid')
            const container = render(() => <DragAndResize>{JSON.stringify(text)}</DragAndResize>);
            expect(container.outerHTML).toBe('<div>Hello World!</div>')
            setText('Drag and Resize')

            // rendering is async
            queueMicrotask(() => {
                expect(container.outerHTML).toBe('<div>Hello Drag and Resize!</div>')
                dispose()
            })
        })
    })
})
