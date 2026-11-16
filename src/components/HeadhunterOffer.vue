<template>
  <div v-if="offer.length > 0" class="scn-Headhunter" data-testid="headhunter">
    <div class="scn-OfficeHeader">
      <span class="scn-StatHint">
        <template v-if="store.queuedOffers > 0">{{ store.queuedOffers }} more to follow</template>
      </span>
      <button
        type="button"
        class="scn-Action scn-Action-outline"
        data-testid="skip-advisor"
        :disabled="props.locked"
        @click="store.skipAdvisorOffer()"
      >
        Pass
      </button>
    </div>
    <p v-if="props.locked" class="scn-AutoLine" data-testid="hire-locked">Catch your breath: choose in {{ props.lockSeconds }}s.</p>
    <p v-else-if="seatsFull" class="scn-AutoLine">Office full: hiring means someone makes way.</p>
    <div class="scn-AdvisorGrid scn-AdvisorGrid-fill">
      <article
        v-for="(a, i) in offer"
        :key="a.id"
        class="scn-AdvisorCard"
        :class="[`scn-AdvisorCard-${a.rarity}`, { 'scn-AdvisorCard-chosen': choosing === i && seatsFull }]"
      >
        <span class="scn-MarketEventTag">{{ RARITY_LABELS[a.rarity] }} · {{ a.roles.map((r) => ROLE_LABELS[r]).join(', ') }}</span>
        <strong>{{ a.name }}</strong>
        <p class="scn-AutoLine">{{ store.wording(a.effectText) }}</p>
        <p class="scn-StatHint">{{ a.costText }} Fee: {{ Math.round(a.hireFeeShare * 100) }}% cash.</p>
        <p v-if="replaces(a.id)" class="scn-StatHint" data-testid="replaces-buyer">Replaces your {{ replaces(a.id) }}</p>
        <button
          v-if="choosing === i && seatsFull"
          type="button"
          class="scn-Action scn-Action-outline"
          data-testid="cancel-replace"
          @click="choosing = null"
        >
          Cancel
        </button>
        <button
          v-else
          type="button"
          class="scn-Action scn-Action-accent"
          data-testid="hire-advisor"
          :disabled="props.locked"
          @click="hire(i)"
        >
          {{ replaces(a.id) ? 'Upgrade' : 'Hire' }}
        </button>
      </article>
    </div>
    <template v-if="chosen && seatsFull">
      <p ref="pickerTitle" class="scn-AutoLine scn-SeatPickerTitle">Who makes way for the {{ chosen.name }}?</p>
      <div class="scn-AdvisorGrid scn-AdvisorGrid-fill" data-testid="seat-picker">
        <article
          v-for="pa in pas"
          :key="`pa-${pa.chair}`"
          class="scn-AdvisorCard"
          :class="`scn-AdvisorCard-${pa.standing.def.rarity}`"
          data-testid="replace-pa-card"
        >
          <div class="scn-AdvisorTags">
            <span class="scn-PaBadge">PA</span>
            <span class="scn-MarketEventTag">{{ pa.rank }} · {{ pa.standing.def.roles.map((r) => ROLE_LABELS[r]).join(', ') }}</span>
          </div>
          <strong>{{ pa.title }}</strong>
          <p class="scn-AutoLine">{{ store.wording(pa.standing.def.effectText) }}</p>
          <p class="scn-StatHint">{{ pa.standing.def.costText }}</p>
          <p class="scn-StatHint">{{ pa.service }}</p>
          <button
            type="button"
            class="scn-Action scn-Action-outline"
            data-testid="replace-pa"
            :disabled="props.locked"
            @click="replace(choosing!, { pa: pa.chair })"
          >
            Let go
          </button>
        </article>
        <article v-for="(seat, s) in seated" :key="s" class="scn-AdvisorCard" :class="`scn-AdvisorCard-${seat.rarity}`">
          <span class="scn-MarketEventTag">{{ RARITY_LABELS[seat.rarity] }} · {{ seat.roles.map((r) => ROLE_LABELS[r]).join(', ') }}</span>
          <strong>{{ seat.name }}</strong>
          <p class="scn-AutoLine">{{ store.wording(seat.effectText) }}</p>
          <p class="scn-StatHint">{{ seat.costText }}</p>
          <button
            type="button"
            class="scn-Action scn-Action-outline"
            data-testid="replace-seat"
            :disabled="props.locked"
            @click="replace(choosing!, s)"
          >
            Let go
          </button>
        </article>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
// The headhunter's current shortlist, with hire buttons. Shown in the hiring
// modal, which opens whenever a shortlist is waiting.
import { computed, nextTick, ref, watch } from 'vue'
import { ADVISORS_BY_ID, ROLE_LABELS } from '../data/advisors'
import { RARITY_LABELS } from '../data/events'
import { useGameStore } from '../stores/game'
import type { HireTarget } from '../stores/modules/office'
import { paCards } from './paCard'

// locked: the buttons show but ignore taps (just after a boss win)
const props = defineProps<{ locked?: boolean; lockSeconds?: number }>()

const store = useGameStore()
const offer = computed(() => store.headhunterOffer.map((id) => ADVISORS_BY_ID[id]).filter(Boolean))
// An empty PA chair takes the next hire, so the office isn't full yet
const seatsFull = computed(() => store.paChairs.every((c) => c !== null) && store.officeSeats.every((s) => s !== null))
const pas = computed(() => paCards(store.paChairs).filter((p) => p !== null))
const seated = computed(() => store.officeSeats.map((s) => (s ? ADVISORS_BY_ID[s.advisorId] : null)).filter((a) => a !== null))

// With the office full, Hire first asks who makes way, showing what each
// current advisor gives, so a swap is never a blind one
const choosing = ref<number | null>(null)
const chosen = computed(() => (choosing.value === null ? null : offer.value[choosing.value] ?? null))
watch(offer, () => (choosing.value = null))
const pickerTitle = ref<HTMLElement | null>(null)

// A buyer replaces the one already buying their list, so needs no seat picked
function replaces(id: string): string | null {
  const inst = store.replacedBuyer(id)
  return inst ? (ADVISORS_BY_ID[inst.advisorId]?.name ?? null) : null
}

function hire(i: number): void {
  if (seatsFull.value && !replaces(offer.value[i].id)) {
    choosing.value = i
    // On a phone the row of current advisors sits below the fold
    void nextTick(() => pickerTitle.value?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }))
  } else {
    store.hireAdvisor(i)
  }
}

function replace(i: number, seat: HireTarget): void {
  choosing.value = null
  store.hireAdvisor(i, seat)
}
</script>
