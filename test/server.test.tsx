import { describe, expect, it } from 'vitest'
import { isServer, renderToString } from 'solid-js/web'
import { DragAndResize } from '../src'

describe('environment', () => {
  it('runs on server', () => {
    expect(typeof window).toBe('undefined')
    expect(isServer).toBe(true)
  })
})

