import * as assert from 'remix/assert'
import { render } from 'remix/component/test'
import { describe, it } from 'remix/test'
import type { TestContext } from 'remix/test'

import { PromptButton } from './public/prompt-button.tsx'

const HOLD_MS = 1200
const FADE_MS = 180

// Replaces navigator.clipboard for one test; the browser's real clipboard needs a user gesture.
function mockClipboard(t: TestContext, writeText: (text: string) => Promise<void>) {
  let original = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
  let spy = t.mock.fn(writeText)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: spy } })
  t.after(() => {
    if (original) Object.defineProperty(navigator, 'clipboard', original)
    else delete (navigator as { clipboard?: Clipboard }).clipboard
  })
  return spy
}

function setup(t: TestContext) {
  let timers = t.useFakeTimers()
  let result = render(<PromptButton text="Add compression middleware" />)
  t.after(result.cleanup)

  let button = result.$('button')
  assert.ok(button instanceof HTMLButtonElement)
  let [status, prompt] = button.querySelectorAll<HTMLElement>('span:last-child > span')
  assert.ok(status && prompt)

  // Lets the click handler's awaited updates settle, so its next timer is registered.
  let settle = () =>
    result.act(async () => {
      for (let i = 0; i < 20; i++) await Promise.resolve()
    })

  // Advances fake time, settling before (so pending timers exist) and after (so updates render).
  async function advance(ms: number) {
    await settle()
    timers.advance(ms)
    await settle()
  }

  // What a screen reader hears: the label span that isn't aria-hidden.
  function announced() {
    return [status, prompt].find((span) => span.getAttribute('aria-hidden') !== 'true')?.textContent
  }

  return { button, status, act: result.act, advance, announced }
}

describe('PromptButton', () => {
  it('copies the prompt, confirms, then resets', async (t) => {
    let writeText = mockClipboard(t, async () => {})
    let { button, status, act, advance, announced } = setup(t)

    assert.equal(announced(), '“Add compression middleware”')
    assert.match(button.className, /bg-transparent/)

    await act(() => button.click())
    await advance(0)

    assert.equal(writeText.mock.calls.length, 1)
    assert.deepEqual(writeText.mock.calls[0].arguments, ['Add compression middleware'])
    assert.equal(announced(), 'Copied to clipboard')
    assert.match(status.className, /\bvisible\b/)
    assert.match(button.className, /bg-surface-4/)

    await advance(HOLD_MS)
    assert.match(status.parentElement!.className, /opacity-0/)
    assert.equal(announced(), 'Copied to clipboard')

    await advance(FADE_MS)
    assert.equal(announced(), '“Add compression middleware”')
    assert.match(status.className, /\binvisible\b/)
    assert.match(button.className, /bg-transparent/)
  })

  it('reports a failed copy, then resets', async (t) => {
    mockClipboard(t, async () => {
      throw new DOMException('Write permission denied', 'NotAllowedError')
    })
    let { button, status, act, advance, announced } = setup(t)

    await act(() => button.click())
    await advance(0)
    assert.equal(announced(), 'Copy failed')

    // While fading out, it must keep saying the copy failed.
    await advance(HOLD_MS)
    assert.match(status.parentElement!.className, /opacity-0/)
    assert.equal(announced(), 'Copy failed')

    await advance(FADE_MS)
    assert.equal(announced(), '“Add compression middleware”')
  })
})
