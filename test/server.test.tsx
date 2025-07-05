import { describe, expect, it } from 'vitest'
import { isServer, renderToString } from 'solid-js/web'
import { DragAndResize } from '../src'

describe('environment', () => {
    it('runs on server', () => {
        expect(typeof window).toBe('undefined')
        expect(isServer).toBe(true)
    })
})

describe('component', () => {
    it('runs on server', () => {
        const string = renderToString(() => <DragAndResize />)
        expect(string).toBe('')
    })
})
