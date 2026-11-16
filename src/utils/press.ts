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

// The browser still sends its click after a pointer press has acted. If the
// press made the button vanish (a scandal answered, an opportunity claimed),
// that click lands on whatever was underneath. So after each press, the next
// click at the same spot is swallowed, wherever it lands.
export const SPENT_CLICK_MS = 1000
const SPENT_CLICK_RADIUS_PX = 30

interface Spot {
  x: number
  y: number
  at: number
}

let spent: Spot[] = []
let listening = false

function now(): number {
  return performance.now()
}

function swallowSpentClick(ev: MouseEvent): void {
  // Keyboard clicks (detail 0) are never the tail of a pointer press
  if (ev.detail === 0) return
  const t = now()
  spent = spent.filter((s) => t - s.at < SPENT_CLICK_MS)
  const i = spent.findIndex((s) => Math.hypot(ev.clientX - s.x, ev.clientY - s.y) <= SPENT_CLICK_RADIUS_PX)
  if (i === -1) return
  spent.splice(i, 1)
  ev.preventDefault()
  ev.stopImmediatePropagation()
}

function markSpent(ev: PointerEvent): void {
  if (typeof document === 'undefined') return
  if (!listening) {
    document.addEventListener('click', swallowSpentClick, { capture: true })
    listening = true
  }
  spent.push({ x: ev.clientX, y: ev.clientY, at: now() })
}

// 'down' acts as the finger lands (Get paid, where speed matters). 'up' acts
// when the same finger lifts without the press turning into a scroll, which
// the browser reports as pointercancel (Buy buttons in a scrolling list).
export function press(action: (ev: MouseEvent) => void, when: PressWhen = 'up'): PressHandlers {
  const down = new Set<number>()
  return {
    pointerdown(ev) {
      if (ev.button !== 0 || isDisabled(ev)) return
      if (when === 'down') {
        markSpent(ev)
        action(ev)
      } else down.add(ev.pointerId)
    },
    pointerup(ev) {
      if (when !== 'up' || !down.delete(ev.pointerId) || isDisabled(ev)) return
      markSpent(ev)
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
