<template>
  <div v-if="offer.length > 0" class="scn-Headhunter" data-testid="headhunter">
    <div class="scn-OfficeHeader">
      <strong>
        Headhunter shortlist<span v-if="store.queuedOffers > 0"> (+{{ store.queuedOffers }} queued)</span>
      </strong>
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
    <div class="scn-AdvisorGrid">
      <article v-for="(a, i) in offer" :key="a.id" class="scn-AdvisorCard" :class="`scn-AdvisorCard-${a.rarity}`">
        <span class="scn-MarketEventTag">{{ RARITY_LABELS[a.rarity] }} · {{ a.roles.map((r) => ROLE_LABELS[r]).join(', ') }}</span>
        <strong>{{ a.name }}</strong>
        <p class="scn-AutoLine">{{ a.effectText }}</p>
        <p class="scn-StatHint">{{ a.costText }} Fee: {{ Math.round(a.hireFeeShare * 100) }}% cash.</p>
        <div v-if="choosing === i && seatsFull" class="scn-SeatPicker" data-testid="seat-picker">
          <p class="scn-AutoLine">Who makes way?</p>
          <button
            v-for="(seat, s) in seated"
            :key="s"
            type="button"
            class="scn-SeatOption"
            data-testid="replace-seat"
            :disabled="props.locked"
            @click="replace(i, s)"
          >
            <strong>{{ seat.name }}</strong>
            <span>{{ seat.effectText }}</span>
          </button>
          <button type="button" class="scn-Action scn-Action-outline" @click="choosing = null">Cancel</button>
        </div>
        <button
          v-else
          type="button"
          class="scn-Action scn-Action-purple"
          data-testid="hire-advisor"
          :disabled="props.locked"
          @click="hire(i)"
        >
          Hire
        </button>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
// The headhunter's current shortlist, with hire buttons. Shown in the family
// office and on the victory screen after a boss win.
import { computed, ref, watch } from 'vue'
import { ADVISORS_BY_ID, ROLE_LABELS } from '../data/advisors'
import { RARITY_LABELS } from '../data/events'
import { useGameStore } from '../stores/game'

// locked: the buttons show but ignore taps (just after a boss win)
const props = defineProps<{ locked?: boolean; lockSeconds?: number }>()

const store = useGameStore()
const offer = computed(() => store.headhunterOffer.map((id) => ADVISORS_BY_ID[id]).filter(Boolean))
// An empty PA chair takes the next hire, so the office isn't full yet
const seatsFull = computed(() => store.paChair !== null && store.officeSeats.every((s) => s !== null))
const seated = computed(() => store.officeSeats.map((s) => (s ? ADVISORS_BY_ID[s.advisorId] : null)).filter((a) => a !== null))

// With the office full, Hire first asks who makes way, showing what each
// current advisor gives, so a swap is never a blind one
const choosing = ref<number | null>(null)
watch(offer, () => (choosing.value = null))

function hire(i: number): void {
  if (seatsFull.value) {
    choosing.value = i
  } else {
    store.hireAdvisor(i)
  }
}

function replace(i: number, seat: number): void {
  choosing.value = null
  store.hireAdvisor(i, seat)
}
</script>
