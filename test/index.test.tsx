import { createRoot, createSignal } from 'solid-js'
import { isServer } from 'solid-js/web'
import { describe, expect, it } from 'vitest'
import { DragAndResize } from '../src'

describe('environment', () => {
  it('runs on client', () => {
    expect(typeof window).toBe('object')
    expect(isServer).toBe(false)
  })
})

describe('Drag and Resize', () => {
  it('Rendering a basic drag and resize component', () => {
    createRoot(() => {
      const container = (<DragAndResize/>) as HTMLDivElement
      expect(container.outerHTML).toBe('<div>Hello World!</div>')
    })
  })

  it('changes the hello target', () =>
    createRoot((dispose) => {
      const [to, setTo] = createSignal('Solid')
      const container = (<DragAndResize />) as HTMLDivElement
      expect(container.outerHTML).toBe('<div>Hello Solid!</div>')
      setTo('Tests')

      // rendering is async
      queueMicrotask(() => {
        expect(container.outerHTML).toBe('<div>Hello Tests!</div>')
        dispose()
      })
    }))
})
