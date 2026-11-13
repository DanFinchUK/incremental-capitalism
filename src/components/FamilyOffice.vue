<template>
  <section class="scn-FamilyOffice" data-testid="family-office" aria-label="Family office">
    <div class="scn-OfficeHeader">
      <h2 class="scn-ColumnTitle">The family office</h2>
      <span class="scn-StatHint">Drain: {{ drainPct }}%</span>
    </div>

    <HeadhunterOffer />
    <div class="scn-AdvisorGrid">
      <article
        class="scn-AdvisorCard scn-AdvisorCard-pa"
        :class="pa ? `scn-AdvisorCard-${pa.def.rarity}` : 'scn-AdvisorCard-empty'"
        data-testid="pa-chair"
      >
        <template v-if="pa">
          <div class="scn-AdvisorTags">
            <span class="scn-PaBadge">PA</span>
            <span class="scn-MarketEventTag">{{ RARITY_LABELS[pa.def.rarity] }} · {{ pa.def.roles.map((r) => ROLE_LABELS[r]).join(', ') }}</span>
          </div>
          <strong>{{ pa.def.name }}</strong>
          <p class="scn-AutoLine">{{ pa.def.effectText }}</p>
          <p v-if="pa.def.campaign" class="scn-StatHint">Campaigning for {{ Math.floor(pa.inst.campaignMs / 60000) }} min</p>
          <p class="scn-StatHint">
            Served {{ pa.inst.servedGenerations }} gen: +{{ pa.inst.servedGenerations * 25 }}% effect, +{{ pa.inst.servedGenerations * 20 }}% pay
          </p>
          <button type="button" class="scn-Action scn-Action-outline" @click="store.firePA()">Let go</button>
        </template>
        <template v-else>
          <span class="scn-PaBadge">Personal Assistant</span>
          <p class="scn-AutoLine">Empty. Stays with the family on retirement.</p>
        </template>
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
        <p v-else class="scn-AutoLine">Open seat. Beat a boss to recruit.</p>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import HeadhunterOffer from './HeadhunterOffer.vue'
import { ADVISORS_BY_ID, ROLE_LABELS } from '../data/advisors'
import { RARITY_LABELS } from '../data/events'
import { useGameStore } from '../stores/game'

const store = useGameStore()

const seats = computed(() =>
  store.officeSeats.map((inst) => (inst ? { inst, def: ADVISORS_BY_ID[inst.advisorId] } : null))
)
const pa = computed(() => (store.paChair ? { inst: store.paChair, def: ADVISORS_BY_ID[store.paChair.advisorId] } : null))
const drainPct = computed(() => Math.round(store.modifiers.incomeDrain * 1000) / 10)
</script>
