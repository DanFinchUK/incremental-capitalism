<template>
  <Transition name="screen" appear>
    <div
      v-if="store.census"
      ref="screen"
      class="reg-Desk"
      role="dialog"
      aria-modal="true"
      aria-labelledby="census-title"
      data-testid="census"
      @click="hurry"
    >
      <article ref="page" class="reg-Page">
        <header class="reg-Head">
          <span class="reg-Office">General Register Office</span>
          <h2 id="census-title" class="reg-Title">Register of New Families</h2>
          <p class="reg-Sub">Every family starts here. Very few are heard of again.</p>
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
            <span class="cen-Name reg-Script">{{ row.name }}</span>
            <dl class="cen-Fields">
              <div>
                <dt class="reg-Label">Occupation</dt>
                <dd class="reg-Script">{{ row.occupation }}</dd>
              </div>
            </dl>
            <p class="cen-Remark reg-Script"><span class="reg-Label">Remarks</span> {{ row.remark }}</p>
          </li>

          <li class="cen-Entry cen-Entry-new" data-testid="census-entry">
            <span class="cen-No">{{ newNo }}</span>
            <span class="cen-Name reg-Script">
              <template v-for="(word, i) in nameWords" :key="i"><span class="reg-Ink" data-stroke>{{ word }}</span>{{ ' ' }}</template>
            </span>
            <dl class="cen-Fields">
              <div v-for="f in fields" :key="f.label">
                <dt class="reg-Label">{{ f.label }}</dt>
                <dd class="reg-Script"><span class="reg-Ink" data-stroke>{{ f.value }}</span></dd>
              </div>
            </dl>
            <p class="cen-Remark reg-Script"><span class="reg-Label">Remarks</span> <span class="reg-Ink" data-stroke>Nothing to their name but ambition.</span></p>

            <div class="cen-Seal reg-Stamp" :class="{ 'reg-Stamp-down': stamped }" aria-hidden="true">
              <span>Entered</span>
              <small>{{ today }}</small>
            </div>
          </li>
        </ol>

        <p class="cen-Motto" :class="{ 'cen-Motto-shown': stamped }" data-testid="census-motto">
          <span class="reg-Label">Motto, self-declared</span>
          <em>{{ arms.motto }}</em>: “{{ arms.translation }}”
        </p>

        <!-- The clerk's pen, carried from word to word -->
        <RegisterQuill ref="quill" :away="done" />
      </article>

      <button
        ref="beginButton"
        type="button"
        class="reg-Button"
        :class="{ 'reg-Button-gold': done }"
        data-testid="census-begin"
        @click.stop="done ? begin() : hurry()"
      >
        {{ done ? 'Begin' : 'Hurry the clerk' }}
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
// A new family written into the register by hand, one word at a time, then
// stamped. Shown whenever a family begins: the first time, after a dynasty
// makes Duke, is abandoned, or a bloodline is folded.
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import RegisterQuill from './RegisterQuill.vue'
import { birthplaceFor, registerDate } from '../data/register'
import { armsFor } from '../engine/crest'
import { playSfx } from '../engine/audio'
import { useGameStore } from '../stores/game'
import { pluralSurname } from '../utils/format'
import { createQuillWriter } from '../utils/quillWriter'

const store = useGameStore()
const screen = ref<HTMLElement | null>(null)
const page = ref<HTMLElement | null>(null)
const quill = ref<InstanceType<typeof RegisterQuill> | null>(null)
const beginButton = ref<HTMLButtonElement | null>(null)
const done = ref(false)
const stamped = ref(false)

const arms = computed(() => armsFor(store.familySurname))
const nameWords = computed(() => store.heir.name.split(' '))
const today = registerDate()

const fields = computed(() => [
  { label: 'Relation to head', value: 'Head' },
  { label: 'Occupation', value: 'None as yet' },
  { label: 'Means', value: 'Nil' },
  { label: 'Where born', value: birthplaceFor(store.familySurname) },
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

// The name is written slowly and with care; the rest at a clerk's pace
const writer = createQuillWriter({
  page: () => page.value,
  quill: () => (quill.value?.$el as HTMLElement | undefined) ?? null,
  msFor: (el) => {
    const chars = el.textContent?.length ?? 1
    return el.closest('.cen-Name') ? Math.max(380, chars * 75) : Math.max(260, chars * 32)
  },
  onStroke: (ms) => playSfx('quill', store.muted, { intensity: Math.min(1, ms / 1500) }),
  onDone: (how) => {
    done.value = true
    stamped.value = true
    if (how !== 'still') playSfx('stamp', store.muted)
    nextTick(() => beginButton.value?.focus({ preventScroll: true }))
  },
  // The page settles before the clerk begins
  delayMs: 750,
  dryClass: 'reg-Dry'
})

async function start(): Promise<void> {
  done.value = false
  stamped.value = false
  await nextTick()
  if (screen.value) screen.value.scrollTop = 0
  await writer.start()
}

// A tap anywhere has the clerk finish at once
function hurry(): void {
  if (!done.value) writer.finish()
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

onUnmounted(() => writer.stop())
</script>

<style scoped>
.cen-Entries {
  list-style: none;
  margin: 0;
  padding: 0;
}

.cen-Entry {
  position: relative;
  padding: 14px 0 12px;
  border-bottom: 1px solid var(--reg-rule);
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
  font-size: clamp(30px, 8vw, 42px);
  line-height: 1.25;
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

.cen-Fields dd {
  margin: 0;
  font-size: 23px;
  line-height: 1.3;
}

.cen-Remark {
  margin: 4px 0 0;
  font-size: 23px;
  line-height: 1.3;
}

.cen-Remark > .reg-Label {
  margin-right: 8px;
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

.cen-Entry-new {
  padding-bottom: 66px;
  border-bottom-width: 0;
}

.cen-Seal {
  position: absolute;
  right: 6px;
  bottom: 6px;
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

.cen-Motto .reg-Label {
  display: block;
  letter-spacing: 0.18em;
}

.cen-Motto em {
  font-size: 19px;
  color: var(--reg-heading);
}

.cen-Motto-shown {
  opacity: 1;
  transform: none;
}

.reg-Button {
  margin-bottom: auto;
}

@media (max-width: 520px) {
  .cen-No {
    display: none;
  }

  .cen-Fields dd,
  .cen-Remark {
    font-size: 21px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cen-Motto {
    transition: none;
  }
}
</style>
