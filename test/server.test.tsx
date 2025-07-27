import { describe, expect, it } from 'vitest'
import { isServer, renderToString } from 'solid-js/web'
import { DragAndResize } from '../src'

describe('environment', () => {
    it('runs on server', () => {
        expect(typeof window).toBe('undefined')
        expect(typeof document).toBe('undefined')
        expect(isServer).toBe(true)
    })
})

describe('component', () => {
    it('runs on server', () => {
        const string = renderToString(() => <DragAndResize />)
        expect(string).toContain('enabled="true" disableUserSelect="true" style="translate:0px 0px;height:100px;width:100px;user-select:auto;-webkit-user-select:auto"')
    })

    it('should allow overriding of the default props', () => {
        const string = renderToString(() => <DragAndResize
            enabled={false}
        />)
        expect(string).toContain("enabled=\"false\"")
    })

    it('should allow passing of optional props', () => {
        const string = renderToString(() => <DragAndResize
            initialState={{x:100}}
            classWhileDragging="hello"
        />)
        expect(string).toContain("initialState=\"[object Object]\"")
        expect(string).toContain("classWhileDragging=\"hello\"")
    })

    it('should allowing passing of html attribute props', () => {
        const string = renderToString(() => <DragAndResize
            id="test-id"
            data-test="test-data"
        />)
        expect(string).toContain("id=\"test-id\"")
        expect(string).toContain("data-test=\"test-data\"")
    })

    it('should merge style and class props', () => {
        const string = renderToString(() => <DragAndResize
            class="test-class"
            style={{
                background: "black",
                height: "200px",
                "border-radius": "5px",
            }}
        />)
        expect(string).toContain("class=\"test-class \"")
        expect(string).toContain("style=\"translate:0px 0px;height:200px;width:100px;user-select:auto;-webkit-user-select:auto;background:black;border-radius:5px\"");
    })

    it('should allow passing every type of props at once', () => {
        const string = renderToString(() => <DragAndResize
            enabled={false}
            initialState={{x:100}}
            classWhileDragging="hello"
            id="test-id"
            data-test="test-data"
            class="test-class"
            style={{
                background: "black",
                height: "200px",
                "border-radius": "5px",
            }}
        />)
        expect(string).toContain("enabled=\"false\"")
        expect(string).toContain("initialState=\"[object Object]\"")
        expect(string).toContain("classWhileDragging=\"hello\"")
        expect(string).toContain("id=\"test-id\"")
        expect(string).toContain("data-test=\"test-data\"")
        expect(string).toContain("class=\"test-class \"")
        expect(string).toContain("style=\"translate:0px 0px;height:200px;width:100px;user-select:auto;-webkit-user-select:auto;background:black;border-radius:5px\"");
    })
})
