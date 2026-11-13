<template>
  <button
    v-if="store.activeEvent"
    type="button"
    class="scn-MarketEvent"
    :class="[`scn-MarketEvent-${store.activeEvent.def.rarity}`, { 'scn-MarketEvent-shady': store.activeEvent.def.shady }]"
    :style="{ left: `${store.activeEvent.xPct}%`, top: `${store.activeEvent.yPct}%` }"
    @click="emit('claim')"
  >
    <span class="scn-MarketEventTag">
      {{ RARITY_LABELS[store.activeEvent.def.rarity] }}
      {{ store.activeEvent.def.shady ? '50/50 Risk' : 'Opportunity' }} · {{ secondsLeft }}s
    </span>
    <div class="scn-CardTitle">{{ store.activeEvent.def.title }}</div>
    <div class="scn-AutoLine">{{ store.activeEvent.def.subtitle }}</div>
    <div v-if="store.activeEvent.corked" class="scn-AutoLine scn-Corked">This one smells a bit off...</div>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RARITY_LABELS } from '../data/events'
import { useGameStore } from '../stores/game'

const emit = defineEmits<{
  (e: 'claim'): void
}>()

const store = useGameStore()

const secondsLeft = computed(() => {
  if (!store.activeEvent) return 0
  return Math.max(1, Math.ceil((store.activeEvent.expiresAt - store.nowMs) / 1000))
})
</script>
