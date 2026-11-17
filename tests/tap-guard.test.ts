import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { installTapGuard, TAP_GUARD_MS } from '../src/utils/tapGuard'

function pointer(type: string, pointerType: string, x = 100, y = 200): MouseEvent {
  const ev = new MouseEvent(type, { bubbles: true, cancelable: true, detail: 1, clientX: x, clientY: y })
  Object.defineProperty(ev, 'pointerType', { value: pointerType })
  return ev
}

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('tap guard', () => {
  let clock = 0
  let remove: () => void
  let under: HTMLButtonElement
  let presses: string[]

  // A touch on Pocket the proceeds that closes the dialog
  async function tapToClose(): Promise<void> {
    document.body.dispatchEvent(pointer('pointerdown', 'touch'))
    document.getElementById('dialog')!.remove()
    await flush()
  }

  beforeEach(() => {
    clock = 1000
    document.body.innerHTML = '<div id="dialog" aria-modal="true"><button>Pocket the proceeds</button></div><button id="under">New bloodline</button>'
    presses = []
    under = document.getElementById('under') as HTMLButtonElement
    for (const type of ['pointerdown', 'pointerup', 'click']) under.addEventListener(type, () => presses.push(type))
    remove = installTapGuard(document, () => clock)
  })

  afterEach(() => remove())

  it('swallows the same tap landing again once its dialog has closed', async () => {
    await tapToClose()
    clock += 50
    under.dispatchEvent(pointer('pointerdown', 'touch'))
    under.dispatchEvent(pointer('pointerup', 'touch'))
    under.dispatchEvent(pointer('click', 'touch'))
    expect(presses).toEqual([])
  })

  it('lets a tap elsewhere through straight away', async () => {
    await tapToClose()
    clock += 50
    under.dispatchEvent(pointer('pointerdown', 'touch', 100, 400))
    expect(presses).toEqual(['pointerdown'])
  })

  it('lets the same spot through once the moment has passed', async () => {
    await tapToClose()
    clock += TAP_GUARD_MS + 1
    under.dispatchEvent(pointer('click', 'touch'))
    expect(presses).toEqual(['click'])
  })

  it('also guards a dialog a tap opens under the finger', async () => {
    document.getElementById('dialog')!.remove()
    await flush()
    document.body.dispatchEvent(pointer('pointerdown', 'touch'))
    const hire = document.createElement('div')
    hire.setAttribute('aria-modal', 'true')
    document.body.appendChild(hire)
    await flush()
    under.dispatchEvent(pointer('click', 'touch'))
    expect(presses).toEqual([])
  })

  it('counts a screen as closed when it starts to fade out, not when the fade ends', async () => {
    // The tap starts the fade: the guard starts with it
    document.body.dispatchEvent(pointer('pointerdown', 'touch'))
    document.getElementById('dialog')!.classList.add('screen-leave-active')
    await flush()
    clock += 50
    under.dispatchEvent(pointer('click', 'touch'))
    expect(presses).toEqual([])
    // The fade ends while the player taps the game: no new guard on their taps
    clock += TAP_GUARD_MS + 1
    under.dispatchEvent(pointer('pointerdown', 'touch'))
    document.getElementById('dialog')!.remove()
    await flush()
    clock += 50
    under.dispatchEvent(pointer('click', 'touch'))
    expect(presses).toEqual(['pointerdown', 'click'])
  })

  it('does nothing when a dialog closes without a tap', async () => {
    document.getElementById('dialog')!.remove()
    await flush()
    under.dispatchEvent(pointer('click', 'touch'))
    expect(presses).toEqual(['click'])
  })

  it('leaves the mouse and keyboard alone', async () => {
    await tapToClose()
    under.dispatchEvent(pointer('click', 'mouse'))
    under.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0, clientX: 100, clientY: 200 }))
    expect(presses).toEqual(['click', 'click'])
  })

  it('catches a touch click that carries no pointer type', async () => {
    await tapToClose()
    under.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1, clientX: 100, clientY: 200 }))
    expect(presses).toEqual([])
  })
})
