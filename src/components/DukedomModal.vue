<template>
  <div
    v-if="store.dynastyComplete"
    class="scn-ModalBackdrop scn-ModalBackdrop-top"
    role="dialog"
    aria-modal="true"
    aria-labelledby="dukedom-title"
    data-testid="dukedom-modal"
  >
    <div class="scn-Modal scn-Modal-xl scn-Dukedom">
      <div class="scn-ModalTop">
        <span class="scn-ModalKicker scn-ModalKicker-gold">The dukedom</span>
        <h2 id="dukedom-title">The {{ store.familySurname }} dynasty</h2>
        <p class="scn-DukedomStyle">Duke {{ store.familySurname }}, of {{ seat }}</p>
      </div>
      <p class="scn-CardMeta">
        The letters patent arrived by courier, which the Palace insists is traditional. {{ generations }} generations after
        {{ founder }} first went looking for work, the family name is on a hospital wing, two racehorses and a bill nobody
        remembers voting for. The {{ pluralSurname(store.familySurname) }} no longer buy influence. Other people queue to buy
        it from them.
      </p>

      <dl class="scn-DynastyRecord" data-testid="dynasty-record">
        <div>
          <dt>Time to the dukedom</dt>
          <dd>{{ formatDuration(store.dynastyMs / 1000) }}</dd>
        </div>
        <div>
          <dt>Generations</dt>
          <dd>{{ generations }}</dd>
        </div>
        <div>
          <dt>Lines</dt>
          <dd>{{ lines.length }}</dd>
        </div>
        <div v-if="fastest">
          <dt>Fastest line</dt>
          <dd>{{ formatDuration(fastest.activeMs / 1000) }} <small>{{ fastest.rank.replace('The ', '') }}</small></dd>
        </div>
        <div>
          <dt>Staff</dt>
          <dd>{{ staffCount }}</dd>
        </div>
        <div v-if="best">
          <dt>Hall of Dynasties best</dt>
          <dd>{{ formatDuration(best.activeMs / 1000) }} <small>the {{ pluralSurname(best.surname) }}</small></dd>
        </div>
      </dl>

      <DynastyRoll :roll="store.familyTree" />

      <div v-if="confirming" class="scn-ModalCallout" data-testid="dukedom-confirm">
        <p>
          The new family starts with nothing: no money, no titles, no staff. The {{ store.familySurname }} record goes in the
          Hall of Dynasties. Achievements and settings stay.
        </p>
        <div class="scn-ModalFooter">
          <button type="button" class="scn-Action scn-Action-outline" @click="confirming = false">Back</button>
          <button type="button" class="scn-Action scn-Action-accent" data-testid="confirm-new-dynasty" @click="found">
            Found the new dynasty
          </button>
        </div>
      </div>
      <div v-else class="scn-ModalFooter">
        <button type="button" class="scn-Action scn-Action-accent" data-testid="new-dynasty" @click="confirming = true">
          Found a new dynasty
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// The end of a dynasty: the family reached Duke. Everyone in it, the time it
// took, and the only way on, a new family
import { computed, ref } from 'vue'
import DynastyRoll from './DynastyRoll.vue'
import { bestDynasty, rollLines } from '../engine/hall'
import { useGameStore } from '../stores/game'
import { formatDuration, pluralSurname } from '../utils/format'

const store = useGameStore()
const confirming = ref(false)

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
const best = computed(() => bestDynasty(store.hall))

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

function found(): void {
  confirming.value = false
  store.foundNewDynasty()
}
</script>
