<template>
  <Transition name="screen">
    <div
      v-if="store.dynastyComplete && !store.menuOpen && !store.census"
      ref="screen"
      class="reg-Desk"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dukedom-title"
      data-testid="dukedom-modal"
      @click="hurry"
    >
      <article ref="page" class="reg-Page fin-Page">
        <header class="reg-Head">
          <span class="reg-Office">General Register Office</span>
          <h2 id="dukedom-title" class="reg-Title">The {{ store.familySurname }} dynasty</h2>
          <p class="reg-Sub">
            Duke {{ store.familySurname }}, of {{ seat }}<template v-if="store.scenario !== 'standard'">, on {{ store.scenarioDef.name }} terms</template>
          </p>
        </header>

        <!-- Where it began, as the clerk first wrote it -->
        <section class="fin-First" aria-labelledby="fin-first-title">
          <h3 id="fin-first-title" class="reg-Label fin-Heading">The original entry</h3>
          <span class="reg-Script fin-FirstName">{{ founder }}</span>
          <dl class="fin-Fields">
            <div>
              <dt class="reg-Label">Occupation</dt>
              <dd class="reg-Script">None as yet</dd>
            </div>
            <div>
              <dt class="reg-Label">Means</dt>
              <dd class="reg-Script">Nil</dd>
            </div>
            <div>
              <dt class="reg-Label">Where born</dt>
              <dd class="reg-Script">{{ birthplaceFor(store.familySurname) }}</dd>
            </div>
          </dl>
        </section>

        <!-- Everyone since, under the rank each line held -->
        <section v-for="(line, i) in lines" :key="i" class="fin-Line">
          <div class="fin-LineHead">
            <h3 class="fin-Rank">{{ line.rank }}</h3>
            <span class="reg-Label">{{ genRange(line) }} · {{ formatDuration(line.activeMs / 1000) }}</span>
          </div>
          <div v-for="p in line.people" :key="p.record.generation" class="fin-Person" data-testid="roll-person">
            <span class="fin-Gen">{{ p.record.generation }}</span>
            <div class="fin-Who">
              <span class="reg-Script fin-Name">{{ p.record.name }}</span>
              <span v-if="p.became !== null" class="reg-Script fin-Became" :class="{ 'fin-Became-duke': p.became >= DUKE_TITLES }">
                Became {{ peerageRank(p.became) }}
              </span>
            </div>
            <span class="reg-Label fin-Stats">Class {{ p.record.deepestGate }} · {{ formatDuration(p.record.activeMs / 1000) }}</span>
            <p v-if="notes(p.record)" class="fin-Notes">{{ notes(p.record) }}</p>
          </div>
        </section>

        <p class="fin-Story">
          The letters patent arrived by courier, which the Palace insists is traditional. {{ generations }} generations after
          {{ founder }} first went looking for work, the family name is on a hospital wing, two racehorses and a bill nobody
          remembers voting for. The {{ pluralSurname(store.familySurname) }} no longer buy influence. Other people queue to buy
          it from them.
        </p>

        <dl class="fin-Record" data-testid="dynasty-record">
          <div>
            <dt class="reg-Label">Time to the dukedom</dt>
            <dd class="reg-Script">{{ formatDuration(store.dynastyMs / 1000) }}</dd>
          </div>
          <div>
            <dt class="reg-Label">Generations</dt>
            <dd class="reg-Script">{{ generations }}</dd>
          </div>
          <div>
            <dt class="reg-Label">Lines</dt>
            <dd class="reg-Script">{{ lines.length }}</dd>
          </div>
          <div v-if="fastest">
            <dt class="reg-Label">Fastest line</dt>
            <dd class="reg-Script">{{ formatDuration(fastest.activeMs / 1000) }}, {{ fastest.rank.replace('The ', '') }}</dd>
          </div>
          <div>
            <dt class="reg-Label">Staff</dt>
            <dd class="reg-Script">{{ staffCount }}</dd>
          </div>
          <div v-if="best">
            <dt class="reg-Label">Hall of Dynasties best<template v-if="store.scenario !== 'standard'">, {{ store.scenarioDef.name }}</template></dt>
            <dd class="reg-Script">{{ formatDuration(best.activeMs / 1000) }}, the {{ pluralSurname(best.surname) }}</dd>
          </div>
        </dl>

        <!-- The chapter closed: the last line in the clerk's hand, ruled off and stamped -->
        <div ref="closing" class="fin-Closing" data-testid="dukedom-closing">
          <p class="reg-Script fin-Created">
            <template v-for="(word, i) in closingWords" :key="i"><span class="reg-Ink" data-stroke>{{ word }}</span>{{ ' ' }}</template>
          </p>
          <div class="fin-RuleOff" :class="{ 'fin-RuleOff-drawn': ruled }" aria-hidden="true"></div>
          <div class="reg-Stamp fin-Stamp" :class="{ 'reg-Stamp-down': stamped }" aria-hidden="true">
            <span>Closed</span>
            <small>{{ today }}</small>
          </div>
        </div>

        <RegisterQuill ref="quill" :away="written" />
      </article>

      <div class="fin-Actions">
        <button type="button" class="reg-Button" data-testid="dukedom-download" @click.stop="downloadSave(store)">Download</button>
        <button type="button" class="reg-Button" data-testid="dukedom-main-menu" @click.stop="shut('menu')">Main menu</button>
        <button type="button" class="reg-Button reg-Button-gold" data-testid="new-dynasty" @click.stop="shut('found')">
          Found a new dynasty
        </button>
      </div>

      <ClosingBook
        v-if="shutting"
        :surname="store.familySurname"
        :seat="seat"
        :generations="generations"
        @done="afterShut"
      />
    </div>
  </Transition>
</template>

<script setup lang="ts">
// The end of a dynasty: the family reached Duke. Its page of the register,
// from the original entry to the last line, which the clerk writes in and
// rules off. Either way on from here, the book is shut on it first.
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import ClosingBook from './ClosingBook.vue'
import RegisterQuill from './RegisterQuill.vue'
import { INHERITED_BY_ID, TRAITS_BY_ID } from '../data/heirs'
import { birthplaceFor, registerDate } from '../data/register'
import { playSfx } from '../engine/audio'
import type { GenerationRecord } from '../engine/family'
import { bestDynasty, rollLines, type RollLine } from '../engine/hall'
import { DUKE_TITLES, peerageRank } from '../engine/peerage'
import { useGameStore } from '../stores/game'
import { downloadSave } from '../utils/downloadSave'
import { formatDuration, pluralSurname } from '../utils/format'
import { createQuillWriter } from '../utils/quillWriter'

const store = useGameStore()
const screen = ref<HTMLElement | null>(null)
const page = ref<HTMLElement | null>(null)
const closing = ref<HTMLElement | null>(null)
const quill = ref<InstanceType<typeof RegisterQuill> | null>(null)
const written = ref(false)
const ruled = ref(false)
const stamped = ref(false)
const shutting = ref<'menu' | 'found' | null>(null)
const today = registerDate()

const lines = computed(() => rollLines(store.familyTree))
const generations = computed(() => store.familyTree.length)
const founder = computed(() => store.familyTree[0]?.name ?? 'the founder')
const fastest = computed(() => {
  let best: (typeof lines.value)[number] | null = null
  // The first line climbs from nothing; the race is between the titled ones
  for (const l of lines.value.slice(1)) if (!best || l.activeMs < best.activeMs) best = l
  return best
})
const staffCount = computed(() => new Set(store.familyTree.flatMap((r) => r.advisors)).size)
const best = computed(() => bestDynasty(store.hall, store.scenario))

// Where the family is Duke of: a seat picked by the surname, so it never changes
const SEATS = [
  'Somewhere With a Very Good School',
  'the Home Counties',
  'Three Offshore Accounts',
  'the Second Home',
  'Wherever the Planning Permission Was',
  'Much Grovelling',
  'Lesser Tax Bracket'
]
const seat = computed(() => {
  let h = 0
  for (const c of store.familySurname) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return SEATS[h % SEATS.length]
})
const closingWords = computed(() => `Created Duke of ${seat.value}.`.split(' '))

function genRange(line: RollLine): string {
  const first = line.people[0].record.generation
  const last = line.people[line.people.length - 1].record.generation
  return first === last ? `Generation ${first}` : `Generations ${first} to ${last}`
}

// Who they were and who they kept: traits, then the staff
function notes(r: GenerationRecord): string {
  const names = [r.traitId ? TRAITS_BY_ID[r.traitId]?.name : null, r.inheritId ? INHERITED_BY_ID[r.inheritId]?.name : null]
  const traits = names.filter((n): n is string => !!n)
  const who = traits.length > 0 ? traits.join(', ') : r.generation === 1 ? 'The founder' : ''
  const kept = staff(r)
  return [who, kept.length > 0 ? `Staff: ${kept.join(', ')}` : ''].filter((x) => x).join('. ')
}

// PAs as they were styled, honours and all, then the rest of the office
function staff(r: GenerationRecord): string[] {
  const pas = r.pas ?? []
  return [...pas, ...r.advisors.slice(pas.length)]
}

// The last line, written once the reader reaches it
const writer = createQuillWriter({
  page: () => page.value,
  quill: () => (quill.value?.$el as HTMLElement | undefined) ?? null,
  msFor: (el) => Math.max(260, (el.textContent?.length ?? 1) * 55),
  onStroke: (ms) => playSfx('quill', store.muted, { intensity: Math.min(1, ms / 1500) }),
  onDone: (how) => {
    written.value = true
    ruled.value = true
    if (how === 'written') {
      later(() => {
        stamped.value = true
        playSfx('stamp', store.muted)
      }, 700)
    } else {
      stamped.value = true
    }
  },
  delayMs: 300,
  dryClass: 'reg-Dry'
})

const timers = new Set<ReturnType<typeof setTimeout>>()
function later(fn: () => void, ms: number): void {
  const t = setTimeout(() => {
    timers.delete(t)
    fn()
  }, ms)
  timers.add(t)
}

let observer: IntersectionObserver | null = null

async function arrive(): Promise<void> {
  written.value = false
  ruled.value = false
  stamped.value = false
  shutting.value = null
  await nextTick()
  if (screen.value) screen.value.scrollTop = 0
  // Hide the last line until the clerk writes it
  for (const el of page.value?.querySelectorAll<HTMLElement>('[data-stroke]') ?? []) el.style.setProperty('--p', '0')
  if (typeof IntersectionObserver !== 'function' || !closing.value) {
    void writer.start()
    return
  }
  observer?.disconnect()
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer?.disconnect()
        observer = null
        void writer.start()
      }
    },
    { threshold: 0.9 }
  )
  observer.observe(closing.value)
}

// A tap while the clerk is writing has him finish
function hurry(): void {
  if (!written.value && writer.running) writer.finish()
}

// The book is shut on the dynasty before anything else happens
function shut(next: 'menu' | 'found'): void {
  if (shutting.value) return
  observer?.disconnect()
  if (!written.value) writer.finish()
  stamped.value = true
  shutting.value = next
}

function afterShut(): void {
  const next = shutting.value
  if (next === 'found') {
    store.openMenu('found')
  } else if (next === 'menu') {
    // The family keeps its seat, and its save, until the player founds the
    // next dynasty: going to the menu loses nothing
    store.openMenu()
  }
}

watch(
  () => store.dynastyComplete && !store.menuOpen && !store.census,
  (shown) => {
    if (shown) void arrive()
    else {
      observer?.disconnect()
      writer.stop()
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  observer?.disconnect()
  writer.stop()
  for (const t of timers) clearTimeout(t)
})
</script>

<style scoped>
.fin-Page {
  margin-top: auto;
}

.fin-Heading {
  display: block;
  margin: 0;
  letter-spacing: 0.18em;
}

.fin-First {
  padding: 14px 0 12px;
  border-bottom: 1px solid var(--reg-rule);
  opacity: 0.7;
}

.fin-FirstName {
  display: block;
  font-size: clamp(26px, 7vw, 34px);
  line-height: 1.25;
}

.fin-Fields {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 20px;
  margin: 2px 0 0;
}

.fin-Fields div {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.fin-Fields dd {
  margin: 0;
  font-size: 21px;
}

.fin-Line {
  padding-top: 16px;
}

.fin-LineHead {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 2px 12px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(74, 59, 42, 0.45);
}

.fin-Rank {
  margin: 0;
  font-family: 'IM Fell English', Georgia, serif;
  font-weight: 400;
  font-size: 22px;
  color: var(--reg-heading);
}

.fin-Person {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0 12px;
  align-items: baseline;
  padding: 8px 0 7px;
  border-bottom: 1px solid var(--reg-rule);
}

.fin-Gen {
  position: absolute;
  left: -48px;
  top: 14px;
  width: 30px;
  text-align: right;
  font-family: 'IM Fell English', Georgia, serif;
  font-size: 14px;
}

.fin-Who {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 12px;
}

.fin-Name {
  font-size: clamp(24px, 6vw, 28px);
  line-height: 1.25;
}

/* Honours go in red ink */
.fin-Became {
  font-size: 21px;
  color: var(--reg-red);
}

.fin-Became-duke {
  font-size: 24px;
}

.fin-Stats {
  white-space: nowrap;
}

.fin-Notes {
  grid-column: 1 / -1;
  margin: 0;
  font-family: 'IM Fell English', Georgia, serif;
  font-style: italic;
  font-size: 14px;
  line-height: 1.4;
}

.fin-Story {
  margin: 22px 0 0;
  font-family: 'IM Fell English', Georgia, serif;
  font-size: 16px;
  line-height: 1.5;
}

.fin-Record {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 8px 20px;
  margin: 18px 0 0;
  padding: 12px 14px;
  border: 1px solid rgba(74, 59, 42, 0.4);
}

.fin-Record div {
  display: flex;
  flex-direction: column;
}

.fin-Record dd {
  margin: 0;
  font-size: 22px;
  line-height: 1.25;
}

.fin-Closing {
  position: relative;
  margin-top: 26px;
  padding-bottom: 58px;
}

.fin-Created {
  margin: 0;
  font-size: clamp(26px, 7vw, 34px);
  line-height: 1.3;
}

/* The page ruled off: two lines drawn across under the last entry */
.fin-RuleOff {
  height: 5px;
  margin-top: 6px;
  border-top: 1.5px solid var(--reg-ink);
  border-bottom: 1.5px solid var(--reg-ink);
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
}

.fin-RuleOff-drawn {
  transform: scaleX(1);
}

.fin-Stamp {
  position: absolute;
  right: 6px;
  bottom: 0;
}

.fin-Actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-bottom: auto;
}

@media (max-width: 520px) {
  .fin-Gen {
    display: none;
  }

  .fin-Person {
    grid-template-columns: 1fr;
  }

  .fin-Actions .reg-Button {
    flex: 1;
    min-width: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fin-RuleOff {
    transition: none;
  }
}
</style>
