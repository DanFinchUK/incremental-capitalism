import { describe, expect, it } from 'vitest'
import { press } from '../src/utils/press'

function pointer(type: string, x = 100, y = 200): PointerEvent {
  const ev = new MouseEvent(type, { bubbles: true, cancelable: true, detail: 1, clientX: x, clientY: y, button: 0 })
  Object.defineProperty(ev, 'pointerId', { value: 1 })
  Object.defineProperty(ev, 'pointerType', { value: 'touch' })
  return ev as PointerEvent
}

describe('press', () => {
  it('stops the click after a press from landing on what was underneath', () => {
    document.body.innerHTML = '<button id="answer">Ride it out</button><button id="under">Buy</button>'
    const answer = document.getElementById('answer') as HTMLButtonElement
    const under = document.getElementById('under') as HTMLButtonElement
    const actions: string[] = []
    const handlers = press(() => {
      actions.push('answer')
      // Answering a scandal takes the card away
      answer.remove()
    })
    answer.addEventListener('pointerdown', handlers.pointerdown)
    answer.addEventListener('pointerup', handlers.pointerup)
    under.addEventListener('click', () => actions.push('under'))

    answer.dispatchEvent(pointer('pointerdown'))
    answer.dispatchEvent(pointer('pointerup'))
    // The browser's click for the same tap now hits the button beneath
    under.dispatchEvent(pointer('click'))
    expect(actions).toEqual(['answer'])

    // The next real tap there works
    under.dispatchEvent(pointer('click'))
    expect(actions).toEqual(['answer', 'under'])
  })

  it('leaves clicks elsewhere and keyboard clicks alone', () => {
    document.body.innerHTML = '<button id="a">A</button><button id="b">B</button>'
    const a = document.getElementById('a') as HTMLButtonElement
    const b = document.getElementById('b') as HTMLButtonElement
    const actions: string[] = []
    const handlers = press(() => actions.push('a'))
    a.addEventListener('pointerdown', handlers.pointerdown)
    a.addEventListener('pointerup', handlers.pointerup)
    b.addEventListener('click', () => actions.push('b'))

    a.dispatchEvent(pointer('pointerdown'))
    a.dispatchEvent(pointer('pointerup'))
    b.dispatchEvent(pointer('click', 100, 400))
    b.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0, clientX: 100, clientY: 200 }))
    expect(actions).toEqual(['a', 'b', 'b'])
  })
})
