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
    <p v-else-if="seatsFull" class="scn-AutoLine">Office full: replace a seat below or pass.</p>
    <div class="scn-AdvisorGrid">
      <article v-for="(a, i) in offer" :key="a.id" class="scn-AdvisorCard" :class="`scn-AdvisorCard-${a.rarity}`">
        <span class="scn-MarketEventTag">{{ RARITY_LABELS[a.rarity] }} · {{ a.roles.map((r) => ROLE_LABELS[r]).join(', ') }}</span>
        <strong>{{ a.name }}</strong>
        <p class="scn-AutoLine">{{ a.effectText }}</p>
        <p class="scn-StatHint">{{ a.costText }} Fee: {{ Math.round(a.hireFeeShare * 100) }}% cash.</p>
        <button
          v-if="!seatsFull"
          type="button"
          class="scn-Action scn-Action-purple"
          data-testid="hire-advisor"
          :disabled="props.locked"
          @click="store.hireAdvisor(i)"
        >
          Hire
        </button>
        <div v-else class="scn-SeatPicker">
          <button
            v-for="(seat, s) in store.officeSeats"
            :key="s"
            type="button"
            class="scn-Action scn-Action-outline"
            data-testid="hire-advisor"
            :disabled="props.locked"
            @click="store.hireAdvisor(i, s)"
          >
            Replace {{ seat ? ADVISORS_BY_ID[seat.advisorId].name : 'seat' }}
          </button>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
// The headhunter's current shortlist, with hire buttons. Shown in the family
// office and on the victory screen after a boss win.
import { computed } from 'vue'
import { ADVISORS_BY_ID, ROLE_LABELS } from '../data/advisors'
import { RARITY_LABELS } from '../data/events'
import { useGameStore } from '../stores/game'

// locked: the buttons show but ignore taps (just after a boss win)
const props = defineProps<{ locked?: boolean; lockSeconds?: number }>()

const store = useGameStore()
const offer = computed(() => store.headhunterOffer.map((id) => ADVISORS_BY_ID[id]).filter(Boolean))
const seatsFull = computed(() => store.officeSeats.every((s) => s !== null))
</script>
