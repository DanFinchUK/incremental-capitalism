<template>
  <div class="scn-Overview">
    <div class="scn-OverviewStats">
      <span>Money: {{ formatCurrency(store.money) }}</span>
      <span>{{ formatCurrency(store.moneyPerSecond) }} /s</span>
      <span>{{ formatCurrency(store.moneyPerClick) }} /click</span>
    </div>

    <div class="scn-OverviewControls">
      <BulkPicker />

      <button
        v-if="store.automationLine > 0"
        type="button"
        class="scn-Action scn-Action-outline"
        :class="{ 'scn-Action-pausedToggle': store.autoBuyPaused }"
        data-testid="toggle-autobuy-pause"
        @click="store.toggleAutoBuyPaused()"
      >
        Automation: {{ store.autoBuyPaused ? 'Paused' : 'On' }}
      </button>

      <button
        v-if="store.automationLine > 0"
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
        :disabled="store.legacyOnRetire < 1"
        @click="emit('retire')"
      >
        Retire for +{{ store.legacyOnRetire }}
      </button>

      <button
        v-if="store.canElevate"
        type="button"
        class="scn-Action scn-Action-purple"
        data-testid="elevate"
        @click="elevateOpen = true"
      >
        Elevate to the Lords (+{{ store.titlesOnElevation }} titles)
      </button>
      <ElevateModal :open="elevateOpen" @close="elevateOpen = false" />

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
import { computed, ref } from 'vue'
import BulkPicker from './BulkPicker.vue'
import ElevateModal from './ElevateModal.vue'
import { useGameStore } from '../stores/game'
import { formatCurrency } from '../utils/format'

const emit = defineEmits<{
  (e: 'retire'): void
}>()

const store = useGameStore()
const elevateOpen = ref(false)

const networkBadgeText = computed(() => {
  if (store.legacyAvailable === 0 && store.legacyPoints >= 1 && store.perks.autoClicker === 0) {
    return 'FREE'
  }
  return String(store.legacyAvailable)
})

</script>
