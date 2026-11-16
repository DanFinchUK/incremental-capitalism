<template>
  <div class="scn-Overview">
    <!-- Only where the command deck stacks above the lists; wider, its Money box stays in view -->
    <div class="scn-OverviewStats">
      <span>Money: {{ formatCurrency(store.money) }}</span>
      <span>{{ formatCurrency(store.moneyPerSecond) }} /s</span>
      <span v-if="!store.noTap">{{ formatCurrency(store.moneyPerClick) }} /click</span>
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
        type="button"
        class="scn-Action scn-Action-outline"
        data-testid="toggle-legacy-shop"
        @click="store.legacyDrawerOpen ? store.closeLegacyDrawer() : (store.legacyDrawerOpen = true)"
      >
        Old Boys' Network
        <span class="scn-BadgeCount">{{ networkBadgeText }}</span>
      </button>

      <!-- Wider, the command deck's Retire box does this -->
      <button
        v-if="phone"
        type="button"
        class="scn-Action"
        :disabled="!store.canRetire"
        :title="retireHint"
        @click="emit('retire')"
      >
        {{ retireLabel }}
      </button>

      <button
        v-if="store.canElevate"
        type="button"
        class="scn-Action scn-Action-accent"
        data-testid="elevate"
        @click="elevateOpen = true"
      >
        Elevate to the Lords (+{{ store.titlesOnElevation }} titles)
      </button>
      <ElevateModal :open="elevateOpen" @close="elevateOpen = false" />

      <button
        type="button"
        class="scn-Action scn-Action-outline"
        data-testid="open-settings"
        @click="store.settingsOpen = true"
      >
        Settings
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

defineProps<{ phone?: boolean }>()

const store = useGameStore()
const elevateOpen = ref(false)

const networkBadgeText = computed(() => {
  if (store.legacyAvailable === 0 && store.legacyPoints >= 1 && store.perks.autoClicker === 0) {
    return 'FREE'
  }
  return String(store.legacyAvailable)
})

const retireLabel = computed(() => {
  if (store.gatesBeaten > 0 && store.gatesBeaten < store.minRetireGate) {
    return `Retire at Gate ${store.minRetireGate}`
  }
  return `Retire for +${store.legacyOnRetire}`
})

const retireHint = computed(() => {
  if (store.gatesBeaten < store.minRetireGate) {
    return `Beat Gate ${store.minRetireGate} to retire this generation`
  }
  return ''
})

</script>
