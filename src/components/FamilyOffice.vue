<template>
  <section v-if="store.shows('office')" class="scn-FamilyOffice" data-testid="family-office" aria-label="Family office">
    <div class="scn-OfficeHeader">
      <h2 class="scn-ColumnTitle">The family office</h2>
      <span class="scn-StatHint">Drain: {{ drainPct }}%</span>
    </div>

    <!-- Shortlists from ordeals the family was waved through wait here, to be seen when convenient -->
    <div v-if="store.waitingOffers > 0" class="scn-WaitingIntros" data-testid="waiting-introductions">
      <span>{{ store.waitingOffers === 1 ? 'An introduction is waiting' : `${store.waitingOffers} introductions are waiting` }}</span>
      <button
        type="button"
        class="scn-Action scn-Action-outline"
        data-testid="show-introductions"
        :disabled="store.headhunterOffer.length > 0"
        @click="store.showWaitingOffer()"
      >
        Show them in
      </button>
    </div>

    <div class="scn-AdvisorGrid">
      <template v-for="(pa, c) in pas" :key="`pa-${c}`">
        <AdvisorCard v-if="pa" :inst="pa.inst" pa data-testid="pa-chair">
          <p class="scn-StatHint" data-testid="pa-service">{{ pa.service }}</p>
          <button type="button" class="scn-Action scn-Action-outline" @click="store.firePA(c)">Let go</button>
        </AdvisorCard>
        <article v-else class="scn-AdvisorCard scn-AdvisorCard-pa scn-AdvisorCard-empty" data-testid="pa-chair">
          <span class="scn-PaBadge">Personal Assistant</span>
          <p class="scn-AutoLine">Empty. Stays with the family on retirement.</p>
        </article>
      </template>

      <template v-for="(seat, s) in seats" :key="s">
        <!-- Promotions and honours earned as PA stay with them here -->
        <AdvisorCard v-if="seat" :inst="seat.inst" data-testid="office-seat">
          <!-- Every PA chair taken: choose who steps down to the open office -->
          <div v-if="swapping === s" class="scn-SeatPicker scn-SwapPicker" data-testid="pa-swap-picker">
            <span class="scn-StatHint">Swap with:</span>
            <button
              v-for="pa in pas.filter((p) => p !== null)"
              :key="pa!.chair"
              type="button"
              class="scn-Action scn-Action-outline"
              data-testid="pa-swap"
              @click="swapInto(s, pa!.chair)"
            >
              {{ pa!.title }}
            </button>
            <button type="button" class="scn-Action scn-Action-outline" @click="swapping = null">Cancel</button>
          </div>
          <div v-else class="scn-SeatPicker">
            <button type="button" class="scn-Action scn-Action-outline" data-testid="promote-pa" @click="makePA(s)">Make PA</button>
            <button type="button" class="scn-Action scn-Action-outline" @click="store.fireAdvisor(s)">Fire</button>
          </div>
        </AdvisorCard>
        <article v-else class="scn-AdvisorCard scn-AdvisorCard-empty" data-testid="office-seat">
          <p class="scn-AutoLine">Open seat. Win an ordeal to take someone on.</p>
        </article>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AdvisorCard from './AdvisorCard.vue'
import { useGameStore } from '../stores/game'
import { paCards } from './paCard'

const store = useGameStore()

const seats = computed(() => paCards(store.officeSeats))
const pas = computed(() => paCards(store.paChairs))

// An empty chair takes them straight away, and with a single chair they
// simply swap with its PA; with several full chairs, ask who swaps out
const swapping = ref<number | null>(null)

function makePA(seat: number): void {
  if (store.paChairs.some((c) => c === null)) {
    store.promoteToPA(seat)
  } else if (store.paChairs.length === 1) {
    store.promoteToPA(seat, 0)
  } else {
    swapping.value = seat
  }
}

function swapInto(seat: number, chair: number): void {
  swapping.value = null
  store.promoteToPA(seat, chair)
}
const drainPct = computed(() => Math.round(store.modifiers.incomeDrain * 1000) / 10)
</script>
