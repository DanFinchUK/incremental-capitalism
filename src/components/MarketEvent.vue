<template>
  <div
    v-if="scandal && store.activeEvent"
    class="scn-MarketEvent scn-MarketEvent-shady scn-MarketEvent-scandal"
    :class="`scn-MarketEvent-${store.activeEvent.def.rarity}`"
    :style="placement"
    role="group"
    :aria-label="store.activeEvent.def.title"
  >
    <span class="scn-MarketEventTag">
      {{ RARITY_LABELS[store.activeEvent.def.rarity] }} Scandal · {{ secondsLeft }}s
    </span>
    <div class="scn-CardTitle">{{ store.activeEvent.def.title }}</div>
    <div class="scn-AutoLine">{{ store.activeEvent.def.subtitle }}</div>
    <div class="scn-ScandalOptions">
      <div v-for="(option, i) in scandal.options" :key="option.label" class="scn-ScandalOption">
        <button type="button" class="scn-Action" data-testid="scandal-option" v-on="optionPress[i]">
          {{ option.label }}
        </button>
        <span class="scn-StatHint">{{ option.detail }}</span>
      </div>
    </div>
  </div>
  <button
    v-else-if="store.activeEvent"
    type="button"
    class="scn-MarketEvent"
    :class="[`scn-MarketEvent-${store.activeEvent.def.rarity}`, { 'scn-MarketEvent-shady': store.activeEvent.def.shady }]"
    :style="placement"
    v-on="claimPress"
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
import { press } from '../utils/press'
import { computed } from 'vue'
import { RARITY_LABELS } from '../data/events'
import { useGameStore } from '../stores/game'

const emit = defineEmits<{
  (e: 'claim'): void
  (e: 'choose', option: number): void
}>()

const store = useGameStore()

// Act per finger, so a pop-up can be hit while still tapping Get paid
const claimPress = press(() => emit('claim'))
const optionPress = [press(() => emit('choose', 0)), press(() => emit('choose', 1))]

// Shift the card back by the same share of its own size as its position on
// screen, so it stays fully visible wherever in the spawn area it lands
const placement = computed(() => {
  const ev = store.activeEvent
  if (!ev) return {}
  return { left: `${ev.xPct}%`, top: `${ev.yPct}%`, '--shift-x': `-${ev.xPct}%`, '--shift-y': `-${ev.yPct}%` }
})

const scandal = computed(() => {
  const effect = store.activeEvent?.def.effect
  return effect?.type === 'scandal' ? effect : null
})

const secondsLeft = computed(() => {
  if (!store.activeEvent) return 0
  return Math.max(1, Math.ceil((store.activeEvent.expiresAt - store.nowMs) / 1000))
})
</script>
