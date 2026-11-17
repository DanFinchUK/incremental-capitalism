// The clerk's hand: writes a page's ink strokes one after another, each
// revealed left to right while the quill's nib follows it, timed by length.
// Shared by the register (a new family) and the finale (a closed chapter).
//
// A stroke is any element marked data-stroke inside the page. Its CSS reads
// --p (0 to 1) to clip itself, and gets the dry class half a second after it
// is finished, for the ink to brown.

export interface QuillWriterOptions {
  page: () => HTMLElement | null
  quill: () => HTMLElement | null
  // How long a stroke takes, from its element
  msFor: (el: HTMLElement) => number
  // Called as each stroke begins, with its length in ms
  onStroke?: (ms: number) => void
  // Called once: when every stroke is written, when hurried by finish(), or
  // at once ('still') when there is to be no movement
  onDone: (how: 'written' | 'hurried' | 'still') => void
  // Wait before the first stroke, for the page to settle
  delayMs?: number
  dryClass: string
}

export interface QuillWriter {
  start: () => Promise<void>
  finish: () => void
  stop: () => void
  readonly running: boolean
}

const LIFT_MS = 200

export function reducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

interface Stroke {
  el: HTMLElement
  start: number
  ms: number
}

export function createQuillWriter(opts: QuillWriterOptions): QuillWriter {
  let strokes: Stroke[] = []
  let raf: number | null = null
  let startedAt = 0
  let finished = false
  let running = false
  const timers = new Set<ReturnType<typeof setTimeout>>()

  function later(fn: () => void, ms: number): void {
    const t = setTimeout(() => {
      timers.delete(t)
      fn()
    }, ms)
    timers.add(t)
  }

  function els(): HTMLElement[] {
    return Array.from(opts.page()?.querySelectorAll<HTMLElement>('[data-stroke]') ?? [])
  }

  function stop(): void {
    if (raf !== null) window.cancelAnimationFrame(raf)
    raf = null
    for (const t of timers) clearTimeout(t)
    timers.clear()
    running = false
  }

  function finish(how: 'written' | 'hurried' | 'still'): void {
    if (finished) return
    stop()
    finished = true
    for (const el of els()) {
      el.style.setProperty('--p', '1')
      el.classList.add(opts.dryClass)
    }
    opts.onDone(how)
  }

  // Where the nib sits at a moment: along the stroke being written, or lifted
  // and on its way to the next
  function placeQuill(elapsed: number): void {
    const quill = opts.quill()
    const page = opts.page()
    if (!quill || !page || strokes.length === 0) return
    const origin = page.getBoundingClientRect()
    const at = (s: Stroke, p: number): [number, number] => {
      const r = s.el.getBoundingClientRect()
      return [r.left - origin.left + r.width * p, r.bottom - origin.top - r.height * 0.28]
    }
    let x: number
    let y: number
    let lift = 0
    const idx = strokes.findIndex((s) => elapsed < s.start + s.ms)
    if (idx === -1) {
      ;[x, y] = at(strokes[strokes.length - 1], 1)
    } else if (elapsed < strokes[idx].start && idx > 0) {
      // Between strokes: carried over in an arc
      const from = at(strokes[idx - 1], 1)
      const to = at(strokes[idx], 0)
      const k = Math.min(1, Math.max(0, (elapsed - (strokes[idx].start - LIFT_MS)) / LIFT_MS))
      const ease = k * k * (3 - 2 * k)
      x = from[0] + (to[0] - from[0]) * ease
      y = from[1] + (to[1] - from[1]) * ease
      lift = Math.sin(Math.PI * k) * 14
    } else {
      const s = strokes[idx]
      ;[x, y] = at(s, Math.max(0, (elapsed - s.start) / s.ms))
      // The hand loops as it writes
      y += Math.sin(elapsed / 38) * 2.2
      x += Math.cos(elapsed / 38) * 1.2
    }
    const tilt = Math.sin(elapsed / 90) * 3
    quill.style.transform = `translate(${x}px, ${y - lift}px) rotate(${tilt}deg)`
    quill.style.opacity = '1'
  }

  async function start(): Promise<void> {
    stop()
    finished = false
    const all = els()
    for (const el of all) {
      el.style.setProperty('--p', '0')
      el.classList.remove(opts.dryClass)
      delete el.dataset.drying
    }
    if (reducedMotion() || typeof window.requestAnimationFrame !== 'function' || all.length === 0) {
      finish('still')
      return
    }
    running = true
    // Measure in the hand it will be written in
    const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts
    if (fonts) await Promise.race([fonts.ready, new Promise((r) => setTimeout(r, 800))])
    if (finished) return
    let t = 0
    strokes = all.map((el, i) => {
      const ms = opts.msFor(el)
      const s = { el, start: t + (i === 0 ? 0 : LIFT_MS), ms }
      t = s.start + ms
      return s
    })
    later(() => {
      startedAt = performance.now()
      let current = -1
      const frame = (now: number): void => {
        const elapsed = now - startedAt
        let idx = strokes.findIndex((s) => elapsed < s.start + s.ms)
        if (idx === -1) idx = strokes.length
        for (const s of strokes) {
          const p = Math.max(0, Math.min(1, (elapsed - s.start) / s.ms))
          s.el.style.setProperty('--p', String(p))
          if (p >= 1 && !s.el.dataset.drying) {
            const el = s.el
            el.dataset.drying = '1'
            later(() => el.classList.add(opts.dryClass), 500)
          }
        }
        if (idx !== current && idx < strokes.length && elapsed >= strokes[idx].start) {
          current = idx
          opts.onStroke?.(strokes[idx].ms)
        }
        placeQuill(elapsed)
        if (idx >= strokes.length) {
          raf = null
          later(() => finish('written'), 350)
          return
        }
        raf = window.requestAnimationFrame(frame)
      }
      raf = window.requestAnimationFrame(frame)
    }, opts.delayMs ?? 0)
  }

  return {
    start,
    finish: () => finish('hurried'),
    stop,
    get running() {
      return running
    }
  }
}
