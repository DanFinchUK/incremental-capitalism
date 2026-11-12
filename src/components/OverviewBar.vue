<template>
  <div class="scn-Overview">
    <div class="scn-OverviewStats">
      <span>Money: {{ formatCurrency(store.money) }}</span>
      <span>{{ formatCurrency(store.moneyPerSecond) }} /s</span>
      <span>{{ formatCurrency(store.moneyPerClick) }} /click</span>
    </div>

    <div class="scn-OverviewControls">
      <div
        class="scn-BulkGroup"
        role="group"
        aria-label="Bulk purchase amount"
        title="Buy amount for clicks and auto-buy. Auto-buy drops to x1 when the batch isn't affordable."
      >
        <button
          v-for="opt in bulkOptions"
          :key="String(opt.mode)"
          type="button"
          class="scn-BulkBtn"
          :class="{ 'scn-BulkBtn-active': store.bulkBuyMode === opt.mode }"
          @click="store.setBulkBuyMode(opt.mode)"
        >
          {{ opt.label }}
        </button>
      </div>

      <button
        v-if="store.legacyPoints >= 1 || store.autoClickers >= 1"
        type="button"
        class="scn-Action scn-Action-outline"
        :class="{ 'scn-Action-pausedToggle': store.autoBuyPaused }"
        data-testid="toggle-autobuy-pause"
        @click="store.toggleAutoBuyPaused()"
      >
        Auto-buy: {{ store.autoBuyPaused ? 'Paused' : 'On' }}
      </button>

      <button
        type="button"
        class="scn-Action scn-Action-outline"
        :class="{ 'scn-Action-activeToggle': store.compactAutoBuy }"
        data-testid="toggle-compact-autobuy"
        @click="store.toggleCompactAutoBuy()"
      >
        Compact auto: {{ store.compactAutoBuy ? 'On' : 'Off' }}
      </button>

      <button
        type="button"
        class="scn-Action scn-Action-outline"
        data-testid="toggle-legacy-shop"
        @click="store.legacyDrawerOpen = !store.legacyDrawerOpen"
      >
        Old Boys' Network
        <span class="scn-BadgeCount">{{ networkBadgeText }}</span>
      </button>

      <button
        type="button"
        class="scn-Action"
        :disabled="store.legacyGain < 1"
        @click="emit('retire')"
      >
        Retire for +{{ store.legacyGain }}
      </button>

      <button
        type="button"
        class="scn-Action scn-Action-outline"
        @click="store.toggleMute()"
      >
        SFX: {{ store.muted ? 'Off' : 'On' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BulkBuyMode } from '../engine/economy'
import { useGameStore } from '../stores/game'
import { formatCurrency } from '../utils/format'

const emit = defineEmits<{
  (e: 'retire'): void
}>()

const store = useGameStore()

const networkBadgeText = computed(() => {
  if (store.legacyAvailable === 0 && store.legacyPoints >= 1 && store.perks.autoClicker === 0) {
    return 'FREE'
  }
  return String(store.legacyAvailable)
})

const bulkOptions: ReadonlyArray<{ mode: BulkBuyMode; label: string }> = [
  { mode: 1, label: 'x1' },
  { mode: 10, label: 'x10' },
  { mode: 'next', label: 'Next' },
  { mode: 'max', label: 'Max' }
]
</script>
