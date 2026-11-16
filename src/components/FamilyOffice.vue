<template>
  <section class="scn-FamilyOffice" data-testid="family-office" aria-label="Family office">
    <div class="scn-OfficeHeader">
      <h2 class="scn-ColumnTitle">The family office</h2>
      <span class="scn-StatHint">Drain: {{ drainPct }}%</span>
    </div>

    <div class="scn-AdvisorGrid">
      <article
        v-for="(pa, c) in pas"
        :key="`pa-${c}`"
        class="scn-AdvisorCard scn-AdvisorCard-pa"
        :class="pa ? `scn-AdvisorCard-${pa.standing.def.rarity}` : 'scn-AdvisorCard-empty'"
        data-testid="pa-chair"
      >
        <template v-if="pa">
          <div class="scn-AdvisorTags">
            <span class="scn-PaBadge">PA</span>
            <span class="scn-MarketEventTag">{{ pa.rank }} · {{ pa.standing.def.roles.map((r) => ROLE_LABELS[r]).join(', ') }}</span>
          </div>
          <strong>{{ pa.title }}</strong>
          <p v-if="pa.standing.hiredAs" class="scn-StatHint">Hired as {{ pa.standing.hiredAs.name }}</p>
          <p class="scn-AutoLine">{{ store.wording(pa.standing.def.effectText) }}</p>
          <p v-if="pa.standing.scale > 1" class="scn-StatHint">Honours: x{{ pa.standing.scale }} effect and pay</p>
          <p v-if="pa.standing.def.campaign" class="scn-StatHint">Campaigning for {{ Math.floor(pa.inst.campaignMs / 60000) }} min</p>
          <p class="scn-StatHint" data-testid="pa-service">{{ pa.service }}</p>
          <button type="button" class="scn-Action scn-Action-outline" @click="store.firePA(c)">Let go</button>
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
          <p class="scn-AutoLine">{{ store.wording(seat.def.effectText) }}</p>
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
import { ADVISORS_BY_ID, ROLE_LABELS } from '../data/advisors'
import { RARITY_LABELS } from '../data/events'
import { useGameStore } from '../stores/game'
import { paCards } from './paCard'

const store = useGameStore()

const seats = computed(() =>
  store.officeSeats.map((inst) => (inst ? { inst, def: ADVISORS_BY_ID[inst.advisorId] } : null))
)
const pas = computed(() => paCards(store.paChairs))
const drainPct = computed(() => Math.round(store.modifiers.incomeDrain * 1000) / 10)
</script>
