<template>
  <section class="scn-FamilyOffice" data-testid="family-office" aria-label="Family office">
    <div class="scn-OfficeHeader">
      <h2 class="scn-ColumnTitle">The family office</h2>
      <span class="scn-StatHint">Advisors drain {{ drainPct }}% of income</span>
    </div>

    <div v-if="offer.length > 0" class="scn-Headhunter" data-testid="headhunter">
      <div class="scn-OfficeHeader">
        <strong>The headhunter has three candidates</strong>
        <button type="button" class="scn-Action scn-Action-outline" @click="store.skipOffer()">Not today</button>
      </div>
      <p v-if="seatsFull" class="scn-AutoLine">The office is full: fire someone first, or hire straight into a seat.</p>
      <div class="scn-AdvisorGrid">
        <article v-for="(a, i) in offer" :key="a.id" class="scn-AdvisorCard" :class="`scn-AdvisorCard-${a.rarity}`">
          <span class="scn-MarketEventTag">{{ RARITY_LABELS[a.rarity] }} · {{ a.roles.map((r) => ROLE_LABELS[r]).join(', ') }}</span>
          <strong>{{ a.name }}</strong>
          <p class="scn-AutoLine">{{ a.effectText }}</p>
          <p class="scn-StatHint">{{ a.costText }} Hiring fee: {{ Math.round(a.hireFeeShare * 100) }}% of cash.</p>
          <button
            v-if="!seatsFull"
            type="button"
            class="scn-Action scn-Action-purple"
            data-testid="hire-advisor"
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
              @click="store.hireAdvisor(i, s)"
            >
              Replace {{ seat ? ADVISORS_BY_ID[seat.advisorId].name : 'seat' }}
            </button>
          </div>
        </article>
      </div>
    </div>

    <div class="scn-AdvisorGrid">
      <article class="scn-AdvisorCard scn-AdvisorCard-pa" data-testid="pa-chair">
        <span class="scn-MarketEventTag">Personal Assistant</span>
        <template v-if="pa">
          <strong>{{ pa.def.name }}</strong>
          <p class="scn-AutoLine">{{ pa.def.effectText }}</p>
          <p class="scn-StatHint">
            Served {{ pa.inst.servedGenerations }} generation{{ pa.inst.servedGenerations === 1 ? '' : 's' }}:
            effect +{{ pa.inst.servedGenerations * 25 }}%, pay +{{ pa.inst.servedGenerations * 20 }}%.
          </p>
          <button type="button" class="scn-Action scn-Action-outline" @click="store.firePA()">Let go</button>
        </template>
        <p v-else class="scn-AutoLine">Empty. Whoever sits here stays with the family when you retire.</p>
      </article>

      <article
        v-for="(seat, s) in seats"
        :key="s"
        class="scn-AdvisorCard"
        :class="seat ? `scn-AdvisorCard-${seat.def.rarity}` : 'scn-AdvisorCard-empty'"
      >
        <template v-if="seat">
          <span class="scn-MarketEventTag">{{ RARITY_LABELS[seat.def.rarity] }} · {{ seat.def.roles.map((r) => ROLE_LABELS[r]).join(', ') }}</span>
          <strong>{{ seat.def.name }}</strong>
          <p class="scn-AutoLine">{{ seat.def.effectText }}</p>
          <p v-if="seat.def.campaign" class="scn-StatHint">Campaigning for {{ Math.floor(seat.inst.campaignMs / 60000) }} min</p>
          <div class="scn-SeatPicker">
            <button type="button" class="scn-Action scn-Action-outline" data-testid="promote-pa" @click="store.promoteToPA(s)">Make PA</button>
            <button type="button" class="scn-Action scn-Action-outline" @click="store.fireAdvisor(s)">Fire</button>
          </div>
        </template>
        <p v-else class="scn-AutoLine">Open seat. Beat a boss to meet the headhunter.</p>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ADVISORS_BY_ID, ROLE_LABELS } from '../data/advisors'
import { RARITY_LABELS } from '../data/events'
import { useGameStore } from '../stores/game'

const store = useGameStore()

const offer = computed(() => store.headhunterOffer.map((id) => ADVISORS_BY_ID[id]).filter(Boolean))
const seats = computed(() =>
  store.officeSeats.map((inst) => (inst ? { inst, def: ADVISORS_BY_ID[inst.advisorId] } : null))
)
const pa = computed(() => (store.paChair ? { inst: store.paChair, def: ADVISORS_BY_ID[store.paChair.advisorId] } : null))
const seatsFull = computed(() => store.officeSeats.every((s) => s !== null))
const drainPct = computed(() => Math.round(store.modifiers.incomeDrain * 1000) / 10)
</script>
