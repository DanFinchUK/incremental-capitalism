<template>
  <article class="scn-AdvisorCard" :class="[`scn-AdvisorCard-${shown.rarity}`, { 'scn-AdvisorCard-pa': pa }]">
    <div class="scn-AdvisorTags">
      <span v-if="pa" class="scn-PaBadge">PA</span>
      <span class="scn-MarketEventTag">{{ rank }} · {{ shown.roles.map((r) => ROLE_LABELS[r]).join(', ') }}</span>
    </div>
    <strong>{{ title }}</strong>
    <p v-if="standing?.hiredAs" class="scn-StatHint">Hired as {{ standing.hiredAs.name }}</p>
    <p class="scn-AutoLine">{{ store.wording(shown.effectText) }}</p>
    <p v-if="standing && standing.scale > 1" class="scn-StatHint">Honours: x{{ standing.scale }} effect and pay</p>
    <p v-if="shown.campaign && inst" class="scn-StatHint">Campaigning for {{ Math.floor(inst.campaignMs / 60000) }} min</p>
    <!-- What this place adds: fees, service, buttons -->
    <slot />
  </article>
</template>

<script setup lang="ts">
// One advisor, as they appear anywhere: the family office, the shortlist
// and the "who makes way" picker. Someone on the staff (inst) shows as they
// stand now, promotions and honours included; a candidate (advisor) as hired.
import { computed } from 'vue'
import { ADVISORS_BY_ID, ROLE_LABELS, type AdvisorDef } from '../data/advisors'
import { STAFF_LABELS } from '../data/events'
import { paStanding, paTitle, type AdvisorInstance } from '../engine/office'
import { useGameStore } from '../stores/game'

const props = defineProps<{ inst?: AdvisorInstance | null; advisor?: AdvisorDef; pa?: boolean }>()
const store = useGameStore()

const standing = computed(() => (props.inst ? paStanding(props.inst) : null))
const shown = computed<AdvisorDef>(() => standing.value?.def ?? props.advisor ?? ADVISORS_BY_ID[props.inst!.advisorId])
const title = computed(() => (standing.value ? paTitle(standing.value) : shown.value.name))
const rank = computed(() => standing.value?.honour ?? STAFF_LABELS[shown.value.rarity])
</script>
