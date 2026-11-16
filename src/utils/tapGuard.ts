// Stops a tap landing twice. On phones the same touch can arrive again just
// after the dialog it was meant for has closed (or another has opened in its
// place), and hit whatever is now under the finger: the New bloodline button
// beneath Pocket the proceeds, say. For a moment after a tap opens or closes
// a dialog, further touches on that same spot are swallowed. Touches
// elsewhere, the mouse and the keyboard are left alone.

export const TAP_GUARD_MS = 400
// How far from the tap that changed the dialogs a repeat still counts
export const TAP_GUARD_RADIUS_PX = 40

const DIALOG_SELECTOR = '[aria-modal="true"]'
const GUARDED_EVENTS = ['pointerdown', 'pointerup', 'click'] as const

interface Spot {
  x: number
  y: number
  at: number
}

export function installTapGuard(root: Document = document, now: () => number = () => performance.now()): () => void {
  let lastTouch: Spot | null = null
  let guard: Spot | null = null
  let openDialogs = new Set<Element>(root.querySelectorAll(DIALOG_SELECTOR))

  const observer = new MutationObserver(() => {
    const current = new Set<Element>(root.querySelectorAll(DIALOG_SELECTOR))
    const changed = current.size !== openDialogs.size || [...current].some((d) => !openDialogs.has(d))
    openDialogs = current
    // Only a change a tap just caused: a dialog that turns up on its own has
    // no repeat to guard against
    if (changed && lastTouch && now() - lastTouch.at < 1000) {
      guard = { x: lastTouch.x, y: lastTouch.y, at: now() }
    }
  })
  observer.observe(root.body, { childList: true, subtree: true })

  function isTouch(ev: MouseEvent): boolean {
    const type = (ev as PointerEvent).pointerType
    if (type) return type === 'touch'
    // A click from a touch, on browsers whose clicks carry no pointer type
    return ev.type === 'click' && ev.detail > 0 && !!lastTouch && now() - lastTouch.at < 1000
  }

  function onEvent(raw: Event): void {
    const ev = raw as MouseEvent
    if (ev.type === 'pointerdown' && (ev as PointerEvent).pointerType === 'touch') {
      // Note where the finger lands before deciding, so a guarded tap still
      // counts as the latest touch
      const spot = { x: ev.clientX, y: ev.clientY, at: now() }
      const blocked = shouldBlock(ev)
      lastTouch = spot
      if (blocked) swallow(ev)
      return
    }
    if (shouldBlock(ev)) swallow(ev)
  }

  function shouldBlock(ev: MouseEvent): boolean {
    if (!guard || now() - guard.at >= TAP_GUARD_MS || !isTouch(ev)) return false
    return Math.hypot(ev.clientX - guard.x, ev.clientY - guard.y) <= TAP_GUARD_RADIUS_PX
  }

  function swallow(ev: Event): void {
    ev.preventDefault()
    ev.stopImmediatePropagation()
  }

  for (const type of GUARDED_EVENTS) root.addEventListener(type, onEvent, { capture: true })
  return () => {
    observer.disconnect()
    for (const type of GUARDED_EVENTS) root.removeEventListener(type, onEvent, { capture: true })
  }
}
