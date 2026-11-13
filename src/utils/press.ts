// Touch-friendly button presses. Phone browsers only turn a lone tap into a
// click: with a second finger down they treat both touches as a possible
// gesture and neither clicks. Pointer events arrive for each finger, so
// presses act on those instead, and the click that follows a pointer press
// is ignored. A click with detail 0 comes from the keyboard and still acts.

export type PressWhen = 'down' | 'up'

export interface PressHandlers {
  pointerdown: (ev: PointerEvent) => void
  pointerup: (ev: PointerEvent) => void
  pointercancel: (ev: PointerEvent) => void
  click: (ev: MouseEvent) => void
}

function isDisabled(ev: Event): boolean {
  const el = ev.currentTarget as HTMLButtonElement | null
  return !!el && el.disabled === true
}

// 'down' acts as the finger lands (Get paid, where speed matters). 'up' acts
// when the same finger lifts without the press turning into a scroll, which
// the browser reports as pointercancel (Buy buttons in a scrolling list).
export function press(action: (ev: MouseEvent) => void, when: PressWhen = 'up'): PressHandlers {
  const down = new Set<number>()
  return {
    pointerdown(ev) {
      if (ev.button !== 0 || isDisabled(ev)) return
      if (when === 'down') action(ev)
      else down.add(ev.pointerId)
    },
    pointerup(ev) {
      if (when !== 'up' || !down.delete(ev.pointerId) || isDisabled(ev)) return
      action(ev)
    },
    pointercancel(ev) {
      down.delete(ev.pointerId)
    },
    click(ev) {
      if (ev.detail === 0 && !isDisabled(ev)) action(ev)
    }
  }
}
