<template>
  <div
    v-if="store.hallOpen"
    class="scn-ModalBackdrop scn-ModalBackdrop-over"
    role="dialog"
    aria-modal="true"
    aria-labelledby="hall-title"
    data-testid="hall-modal"
    @click.self="store.hallOpen = false"
  >
    <div class="scn-Modal scn-Modal-xl">
      <div class="scn-DrawerHeader">
        <div class="scn-ModalTop">
          <span class="scn-ModalKicker scn-ModalKicker-gold">Hall of Dynasties</span>
          <h2 id="hall-title">Families that made Duke</h2>
        </div>
        <button type="button" class="scn-Action scn-Action-outline" @click="store.hallOpen = false">Close</button>
      </div>
      <p class="scn-CardMeta">
        Portraits line the corridor in order of arrival. The ones that got here quickest hang nearest the door, where the
        guests can see them.
      </p>
      <p v-if="store.hall.length === 0" class="scn-AutoLine" data-testid="hall-empty">
        No family has made Duke yet. The frames are up and the nails are in.
      </p>
      <details v-for="(d, i) in store.hall" :key="`${d.surname}-${d.finishedAt}`" class="scn-HallEntry" data-testid="hall-entry">
        <summary>
          <strong>The {{ pluralSurname(d.surname) }}</strong>
          <span v-if="d.scenario !== 'standard'" class="scn-ScenarioTag">{{ SCENARIOS_BY_ID[d.scenario].name }}</span>
          <span v-if="bestOf(d) === d" class="scn-HallBest">Best</span>
          <span class="scn-HallStats">
            {{ formatDuration(d.activeMs / 1000) }} · {{ d.roll.length }} generations · {{ rollLines(d.roll).length }} lines
            <template v-if="d.finishedAt > 0"> · {{ dateText(d.finishedAt) }}</template>
          </span>
          <span class="scn-HallIndex">#{{ store.hall.length - i }}</span>
        </summary>
        <DynastyRoll :roll="d.roll" />
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
// Every family that reached Duke, newest first, each with its roll
import DynastyRoll from './DynastyRoll.vue'
import { SCENARIOS_BY_ID } from '../data/scenarios'
import { bestDynasty, rollLines, type DynastyRecord } from '../engine/hall'
import { useGameStore } from '../stores/game'
import { formatDuration, pluralSurname } from '../utils/format'
import { useEscapeKey } from '../utils/useEscapeKey'

const store = useGameStore()
// Each scenario keeps its own best
function bestOf(d: DynastyRecord): DynastyRecord | null {
  return bestDynasty(store.hall, d.scenario)
}
useEscapeKey(() => store.hallOpen, () => (store.hallOpen = false))

function dateText(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>
