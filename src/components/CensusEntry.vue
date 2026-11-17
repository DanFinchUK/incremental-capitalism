<template>
  <div
    v-if="store.census"
    ref="screen"
    class="cen-Screen"
    role="dialog"
    aria-modal="true"
    aria-labelledby="census-title"
    data-testid="census"
    @click="hurry"
  >
    <article ref="page" class="cen-Page">
      <header class="cen-Head">
        <span class="cen-Office">General Register Office</span>
        <h2 id="census-title" class="cen-Title">Register of New Families</h2>
        <p class="cen-Sub">Every family starts here. Very few are heard of again.</p>
      </header>

      <ol class="cen-Entries">
        <li
          v-for="row in earlier"
          :key="row.no"
          class="cen-Entry cen-Entry-old"
          :class="{ 'cen-Entry-struck': row.struck }"
          data-testid="census-earlier"
        >
          <span class="cen-No">{{ row.no }}</span>
          <span class="cen-Name">{{ row.name }}</span>
          <dl class="cen-Fields">
            <div>
              <dt>Occupation</dt>
              <dd>{{ row.occupation }}</dd>
            </div>
          </dl>
          <p class="cen-Remark"><span>Remarks</span> {{ row.remark }}</p>
        </li>

        <li class="cen-Entry cen-Entry-new" data-testid="census-entry">
          <span class="cen-No">{{ newNo }}</span>
          <span class="cen-Name">
            <template v-for="(word, i) in nameWords" :key="i"><span class="cen-Ink" data-stroke>{{ word }}</span>{{ ' ' }}</template>
          </span>
          <dl class="cen-Fields">
            <div v-for="f in fields" :key="f.label">
              <dt>{{ f.label }}</dt>
              <dd><span class="cen-Ink" data-stroke>{{ f.value }}</span></dd>
            </div>
          </dl>
          <p class="cen-Remark"><span>Remarks</span> <span class="cen-Ink" data-stroke>Nothing to their name but ambition.</span></p>

          <div class="cen-Seal" :class="{ 'cen-Seal-down': stamped }" aria-hidden="true">
            <span>Entered</span>
            <small>{{ today }}</small>
          </div>
        </li>
      </ol>

      <p class="cen-Motto" :class="{ 'cen-Motto-shown': stamped }" data-testid="census-motto">
        <span>Motto, self-declared</span>
        <em>{{ arms.motto }}</em>: “{{ arms.translation }}”
      </p>

      <!-- The clerk's pen, carried from word to word -->
      <div ref="quill" class="cen-Quill" :class="{ 'cen-Quill-away': done }" aria-hidden="true">
        <svg viewBox="0 0 100 120" width="92" height="110">
          <defs>
            <linearGradient id="cen-vane" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stop-color="#cfc2a6" />
              <stop offset="0.45" stop-color="#f7f0e0" />
              <stop offset="1" stop-color="#e2d6bb" />
            </linearGradient>
          </defs>
          <path d="M22 96 C8 70 40 22 97 1 C88 38 62 84 22 96 Z" fill="url(#cen-vane)" stroke="#7d6a4c" stroke-width="1.1" />
          <path
            d="M30 86 L50 74 M36 78 L58 64 M42 68 L66 52 M50 58 L74 40 M58 48 L82 28 M66 38 L88 16 M28 88 L18 76 M34 80 L24 62 M42 70 L34 52 M50 60 L44 40 M60 48 L56 28 M70 36 L68 18"
            stroke="#a8977a"
            stroke-width="0.9"
          />
          <path d="M4 116 L94 4" stroke="#5a4630" stroke-width="2.4" stroke-linecap="round" />
          <path d="M4 116 L22 94" stroke="#1d1712" stroke-width="2.8" stroke-linecap="round" />
          <path d="M2.5 118 L10 103 L16.5 108.5 Z" fill="#0f0b08" />
        </svg>
      </div>
    </article>

    <button
      ref="beginButton"
      type="button"
      class="cen-Begin"
      :class="{ 'cen-Begin-ready': done }"
      data-testid="census-begin"
      @click.stop="done ? begin() : hurry()"
    >
      {{ done ? 'Begin' : 'Hurry the clerk' }}
    </button>
  </div>
</template>

<script setup lang="ts">
// A new family written into the register by hand, one word at a time, then
// stamped. Shown whenever a family begins: the first time, after a dynasty
// makes Duke, is abandoned, or a bloodline is folded.
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { armsFor } from '../engine/crest'
import { playSfx } from '../engine/audio'
import { useGameStore } from '../stores/game'
import { pluralSurname } from '../utils/format'

const store = useGameStore()
const screen = ref<HTMLElement | null>(null)
const page = ref<HTMLElement | null>(null)
const quill = ref<HTMLElement | null>(null)
const beginButton = ref<HTMLButtonElement | null>(null)
const done = ref(false)
const stamped = ref(false)

const arms = computed(() => armsFor(store.familySurname))
const nameWords = computed(() => store.heir.name.split(' '))
const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

// Where the founder was born: picked by the surname, so it never changes
const BIRTHPLACES = [
  'A box room in Swindon',
  'Above a chip shop, Margate',
  'A new-build in Milton Keynes',
  'A caravan outside Skegness',
  'A house share in Croydon',
  'Basingstoke, regrettably',
  'A maisonette in Slough'
]
const birthplace = computed(() => {
  let h = 0
  for (const c of store.familySurname) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return BIRTHPLACES[h % BIRTHPLACES.length]
})

const fields = computed(() => [
  { label: 'Relation to head', value: 'Head' },
  { label: 'Occupation', value: 'None as yet' },
  { label: 'Means', value: 'Nil' },
  { label: 'Where born', value: birthplace.value },
  ...(store.scenario !== 'standard' ? [{ label: 'Terms', value: store.scenarioDef.name }] : [])
])

interface EarlierRow {
  no: number
  name: string
  occupation: string
  remark: string
  struck: boolean
}

// The entries above: a family or two from the Hall, then whoever just left
const earlier = computed<EarlierRow[]>(() => {
  const census = store.census
  const rows: Omit<EarlierRow, 'no'>[] = []
  const previous = census?.previous ?? null
  const fromHall = [...store.hall]
    .sort((a, b) => a.finishedAt - b.finishedAt)
    .filter((d) => !(census?.departure === 'duke' && d.surname === previous))
    .slice(previous ? -1 : -2)
  for (const d of fromHall) {
    rows.push({ name: `The ${pluralSurname(d.surname)}`, occupation: 'Duke', remark: 'Moved up. See the Hall of Dynasties.', struck: false })
  }
  if (previous && census?.departure === 'duke') {
    rows.push({ name: `The ${pluralSurname(previous)}`, occupation: 'Duke', remark: 'Moved up. Entry sent on to the Hall of Dynasties.', struck: false })
  } else if (previous && census?.departure === 'abandoned') {
    rows.push({ name: `The ${pluralSurname(previous)}`, occupation: 'Whatever they were doing before', remark: 'Struck off at their own request.', struck: true })
  } else if (previous && census?.departure === 'folded') {
    rows.push({ name: `The ${pluralSurname(previous)}`, occupation: 'Not recorded', remark: 'Bloodline folded. Struck off.', struck: true })
  }
  // Families in the Hall keep their place in it; anyone struck off comes after
  const inHall = fromHall.length + (census?.departure === 'duke' ? 1 : 0)
  const first = Math.max(1, store.hall.length - inHall + 1)
  return rows.map((r, i) => ({ ...r, no: first + i }))
})
const newNo = computed(() => {
  const rows = earlier.value
  return rows.length > 0 ? rows[rows.length - 1].no + 1 : store.hall.length + 1
})

// The writing: each word or field is a stroke, revealed left to right while
// the quill's nib follows it. Timed by its length.
interface Stroke {
  el: HTMLElement
  start: number
  ms: number
}
let strokes: Stroke[] = []
let raf: number | null = null
let startedAt = 0
const timers = new Set<ReturnType<typeof setTimeout>>()
const LIFT_MS = 200
const NAME_MS_PER_CHAR = 75
const FIELD_MS_PER_CHAR = 32

function later(fn: () => void, ms: number): void {
  const t = setTimeout(() => {
    timers.delete(t)
    fn()
  }, ms)
  timers.add(t)
}

function reducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

async function start(): Promise<void> {
  done.value = false
  stamped.value = false
  await nextTick()
  if (screen.value) screen.value.scrollTop = 0
  const els = Array.from(page.value?.querySelectorAll<HTMLElement>('[data-stroke]') ?? [])
  for (const el of els) {
    el.style.setProperty('--p', '0')
    el.classList.remove('cen-Dry')
  }
  if (reducedMotion() || typeof window.requestAnimationFrame !== 'function') {
    finish(false)
    return
  }
  // Measure in the hand it will be written in
  const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts
  if (fonts) await Promise.race([fonts.ready, new Promise((r) => setTimeout(r, 800))])
  if (done.value) return
  let t = 0
  strokes = els.map((el, i) => {
    const isName = el.closest('.cen-Name') !== null
    const chars = el.textContent?.length ?? 1
    const ms = isName ? Math.max(380, chars * NAME_MS_PER_CHAR) : Math.max(260, chars * FIELD_MS_PER_CHAR)
    const s = { el, start: t + (i === 0 ? 0 : LIFT_MS), ms }
    t = s.start + ms
    return s
  })
  // The page settles before the clerk begins
  later(() => {
    startedAt = performance.now()
    let current = -1
    const frame = (now: number): void => {
      const elapsed = now - startedAt
      let idx = strokes.findIndex((s) => elapsed < s.start + s.ms)
      if (idx === -1) idx = strokes.length
      for (let i = 0; i < strokes.length; i++) {
        const s = strokes[i]
        const p = Math.max(0, Math.min(1, (elapsed - s.start) / s.ms))
        s.el.style.setProperty('--p', String(p))
        if (p >= 1 && !s.el.classList.contains('cen-Dry')) {
          const el = s.el
          later(() => el.classList.add('cen-Dry'), 500)
        }
      }
      if (idx !== current && idx < strokes.length && elapsed >= strokes[idx].start) {
        current = idx
        playSfx('quill', store.muted, { intensity: Math.min(1, strokes[idx].ms / 1500) })
      }
      placeQuill(elapsed)
      if (idx >= strokes.length) {
        raf = null
        later(() => finish(true), 350)
        return
      }
      raf = window.requestAnimationFrame(frame)
    }
    raf = window.requestAnimationFrame(frame)
  }, 750)
}

// Where the nib sits at a moment: along the stroke being written, or lifted
// and on its way to the next
function placeQuill(elapsed: number): void {
  if (!quill.value || !page.value || strokes.length === 0) return
  const origin = page.value.getBoundingClientRect()
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
  quill.value.style.transform = `translate(${x}px, ${y - lift}px) rotate(${tilt}deg)`
  quill.value.style.opacity = '1'
}

function finish(withSound: boolean): void {
  if (done.value) return
  if (raf !== null) window.cancelAnimationFrame(raf)
  raf = null
  for (const t of timers) clearTimeout(t)
  timers.clear()
  for (const el of page.value?.querySelectorAll<HTMLElement>('[data-stroke]') ?? []) {
    el.style.setProperty('--p', '1')
    el.classList.add('cen-Dry')
  }
  done.value = true
  stamped.value = true
  if (withSound) playSfx('stamp', store.muted)
  nextTick(() => beginButton.value?.focus({ preventScroll: true }))
}

// A tap anywhere has the clerk finish at once
function hurry(): void {
  if (!done.value) finish(true)
}

function begin(): void {
  store.closeCensus(Date.now())
}

watch(
  () => store.census,
  (entry, before) => {
    if (entry && entry !== before) void start()
  },
  { immediate: true }
)

onUnmounted(() => {
  if (raf !== null) window.cancelAnimationFrame(raf)
  for (const t of timers) clearTimeout(t)
})
</script>

<style scoped>
.cen-Screen {
  --cen-ink-wet: #120f2e;
  --cen-ink: #3b2817;
  --cen-print: #4a3b2a;
  --cen-rule: rgba(64, 92, 130, 0.35);
  --cen-red: #a3242a;
  position: fixed;
  inset: 0;
  z-index: 46;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
  padding: max(28px, env(safe-area-inset-top)) 16px max(28px, env(safe-area-inset-bottom));
  color-scheme: light;
  background:
    radial-gradient(ellipse 70% 55% at 50% 32%, rgba(255, 196, 110, 0.22), transparent 70%),
    repeating-linear-gradient(92deg, rgba(0, 0, 0, 0.06) 0 2px, transparent 2px 9px),
    radial-gradient(ellipse at 50% 40%, #4a301c 0%, #24160c 60%, #0d0805 100%);
  background-attachment: fixed;
}

/* A page of the register: rag paper, a little foxed, on the clerk's desk */
.cen-Page {
  position: relative;
  width: 100%;
  max-width: 640px;
  margin: auto 0 0;
  padding: 26px 24px 30px 58px;
  color: var(--cen-print);
  background:
    radial-gradient(ellipse at 18% 12%, rgba(255, 255, 255, 0.45), transparent 55%),
    radial-gradient(ellipse at 85% 92%, rgba(139, 94, 30, 0.22), transparent 50%),
    radial-gradient(circle at 70% 30%, rgba(139, 94, 30, 0.08) 0 3px, transparent 4px),
    radial-gradient(circle at 22% 78%, rgba(139, 94, 30, 0.1) 0 2px, transparent 3px),
    linear-gradient(180deg, #f3e8cb, #ead9b0);
  border-radius: 2px;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.5) inset,
    0 0 60px rgba(120, 80, 20, 0.25) inset,
    0 30px 60px rgba(0, 0, 0, 0.55),
    0 6px 14px rgba(0, 0, 0, 0.4);
  transform: rotate(-0.5deg);
  animation: cen-settle 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) both;
}

/* The margin rule, in red, twice */
.cen-Page::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 42px;
  width: 4px;
  border-left: 1px solid rgba(163, 36, 42, 0.55);
  border-right: 1px solid rgba(163, 36, 42, 0.55);
}

.cen-Head {
  text-align: center;
  padding-bottom: 14px;
  margin-bottom: 4px;
  border-bottom: 3px double rgba(74, 59, 42, 0.55);
}

.cen-Office {
  font-family: 'IM Fell English SC', Georgia, serif;
  font-size: 14px;
  letter-spacing: 0.22em;
}

.cen-Title {
  margin: 2px 0 2px;
  font-family: 'IM Fell English', Georgia, serif;
  font-weight: 400;
  font-size: clamp(24px, 6vw, 32px);
  line-height: 1.1;
  color: #2c2015;
}

.cen-Sub {
  margin: 0;
  font-family: 'IM Fell English', Georgia, serif;
  font-style: italic;
  font-size: 15px;
}

.cen-Entries {
  list-style: none;
  margin: 0;
  padding: 0;
}

.cen-Entry {
  position: relative;
  padding: 14px 0 12px;
  border-bottom: 1px solid var(--cen-rule);
}

.cen-No {
  position: absolute;
  left: -48px;
  top: 20px;
  width: 30px;
  text-align: right;
  font-family: 'IM Fell English', Georgia, serif;
  font-size: 14px;
}

.cen-Name {
  display: block;
  font-family: 'Pinyon Script', 'Snell Roundhand', cursive;
  font-size: clamp(30px, 8vw, 42px);
  line-height: 1.25;
  color: var(--cen-ink);
}

.cen-Fields {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 22px;
  margin: 4px 0 0;
}

.cen-Fields div {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.cen-Fields dt {
  font-family: 'IM Fell English SC', Georgia, serif;
  font-size: 13px;
  letter-spacing: 0.04em;
}

.cen-Fields dd {
  margin: 0;
  font-family: 'Pinyon Script', 'Snell Roundhand', cursive;
  font-size: 23px;
  line-height: 1.3;
  color: var(--cen-ink);
}

.cen-Remark {
  margin: 4px 0 0;
  font-family: 'Pinyon Script', 'Snell Roundhand', cursive;
  font-size: 23px;
  line-height: 1.3;
  color: var(--cen-ink);
}

.cen-Remark > span:first-child {
  margin-right: 8px;
  font-family: 'IM Fell English SC', Georgia, serif;
  font-size: 13px;
  letter-spacing: 0.04em;
  color: var(--cen-print);
}

/* Older entries: dry, faded, some struck through */
.cen-Entry-old {
  opacity: 0.62;
}

.cen-Entry-old .cen-Name {
  font-size: clamp(24px, 6vw, 30px);
}

.cen-Entry-struck .cen-Name {
  text-decoration: line-through;
  text-decoration-thickness: 2px;
  text-decoration-color: rgba(59, 40, 23, 0.85);
}

/* Fresh ink: written left to right as --p runs from 0 to 1, blue-black and
   glossy while wet, browning as it dries */
.cen-Ink {
  display: inline-block;
  /* Room for the script's tails, which run past the letters' own width */
  padding-right: 0.45em;
  margin-right: -0.45em;
  clip-path: inset(-0.5em calc((1 - var(--p, 0)) * 100%) -0.5em -0.3em);
  color: var(--cen-ink-wet);
  text-shadow: 0 0 1px rgba(18, 15, 46, 0.45);
  transition: color 2.4s ease, text-shadow 2.4s ease;
}

.cen-Ink.cen-Dry {
  color: var(--cen-ink);
  text-shadow: none;
}

.cen-Entry-new {
  padding-bottom: 66px;
  border-bottom-width: 0;
}

/* The office stamp */
.cen-Seal {
  position: absolute;
  right: 6px;
  bottom: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 12px 4px;
  border: 3px double var(--cen-red);
  border-radius: 4px;
  color: var(--cen-red);
  font-family: 'IM Fell English SC', Georgia, serif;
  line-height: 1;
  mix-blend-mode: multiply;
  opacity: 0;
  transform: rotate(-9deg) scale(1.9);
  pointer-events: none;
}

.cen-Seal span {
  font-size: 24px;
  letter-spacing: 0.16em;
}

.cen-Seal small {
  margin-top: 3px;
  font-size: 12px;
  letter-spacing: 0.1em;
}

.cen-Seal-down {
  animation: cen-stamp 0.32s cubic-bezier(0.3, 0, 0.4, 1.4) forwards;
}

.cen-Motto {
  margin: 6px 0 0;
  text-align: center;
  font-family: 'IM Fell English', Georgia, serif;
  font-size: 16px;
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 0.8s 0.35s ease, transform 0.8s 0.35s ease;
}

.cen-Motto span {
  display: block;
  font-family: 'IM Fell English SC', Georgia, serif;
  font-size: 13px;
  letter-spacing: 0.18em;
}

.cen-Motto em {
  font-size: 19px;
  color: #2c2015;
}

.cen-Motto-shown {
  opacity: 1;
  transform: none;
}

/* The quill: its nib is the bottom-left corner of the drawing */
.cen-Quill {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
  will-change: transform;
}

.cen-Quill svg {
  position: absolute;
  left: -2px;
  bottom: -2px;
  filter: drop-shadow(6px 10px 6px rgba(0, 0, 0, 0.35));
  transition: transform 0.9s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.9s ease;
}

.cen-Quill-away svg {
  transform: translate(60px, -90px) rotate(10deg);
  opacity: 0;
}

.cen-Begin {
  min-width: 220px;
  min-height: 48px;
  margin-bottom: auto;
  padding: 10px 26px;
  border: 1px solid rgba(214, 169, 60, 0.45);
  border-radius: 4px;
  background: rgba(12, 7, 8, 0.45);
  color: #d8c9a6;
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-weight: 700;
  font-size: 20px;
  cursor: pointer;
  transition: background-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease;
}

.cen-Begin-ready {
  color: #240910;
  border-color: #d6a93c;
  background: linear-gradient(180deg, #f6dd8f, #d6a93c);
  box-shadow: 0 0 30px rgba(214, 169, 60, 0.35);
  animation: cen-rise 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) both;
}

.cen-Begin:focus-visible {
  outline: 2px solid #f6dd8f;
  outline-offset: 3px;
}

@media (max-width: 520px) {
  .cen-Page {
    padding: 20px 14px 24px 40px;
    transform: none;
  }

  .cen-Page::before {
    left: 28px;
  }

  .cen-No {
    display: none;
  }

  .cen-Fields dd,
  .cen-Remark {
    font-size: 21px;
  }

  .cen-Seal span {
    font-size: 20px;
  }
}

@keyframes cen-settle {
  from {
    opacity: 0;
    transform: translateY(24px) rotate(-2deg);
  }
}

@keyframes cen-stamp {
  0% {
    opacity: 0;
    transform: rotate(-9deg) scale(1.9);
  }
  70% {
    opacity: 0.9;
    transform: rotate(-9deg) scale(0.94);
  }
  100% {
    opacity: 0.85;
    transform: rotate(-9deg) scale(1);
  }
}

@keyframes cen-rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cen-Page,
  .cen-Begin-ready,
  .cen-Seal-down {
    animation: none;
  }

  .cen-Seal-down {
    opacity: 0.85;
    transform: rotate(-9deg);
  }

  .cen-Ink,
  .cen-Motto {
    transition: none;
  }

  .cen-Quill {
    display: none;
  }
}
</style>
