<template>
  <div
    class="scn-BulkGroup"
    role="group"
    aria-label="Bulk purchase amount"
    title="How many to buy per click. Hire an Estate Manager and anything under the automation line restocks itself."
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
</template>

<script setup lang="ts">
import type { BulkBuyMode } from '../engine/economy'
import { useGameStore } from '../stores/game'

const store = useGameStore()

const bulkOptions: ReadonlyArray<{ mode: BulkBuyMode; label: string }> = [
  { mode: 1, label: 'x1' },
  { mode: 10, label: 'x10' },
  { mode: 'next', label: 'Next' },
  { mode: 'max', label: 'Max' }
]
</script>
