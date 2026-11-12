<template>
  <div v-if="store.offlineReport" class="scn-ModalBackdrop" role="dialog" aria-modal="true">
    <div class="scn-Modal">
      <h2>Welcome back to the Boardroom</h2>
      <p>
        While you were away for <strong>{{ formatDuration(store.offlineReport.secondsCredited) }}</strong>,
        your portfolio extracted passive returns at
        <strong>{{ Math.round(store.offlineReport.efficiency * 100) }}%</strong> offshore efficiency:
      </p>
      <div class="scn-DataValue" style="font-size: 26px; color: #4e6e1d">
        +{{ formatCurrency(store.offlineReport.moneyEarned) }}
      </div>
      <p class="scn-AutoLine">
        Tip: Upgrade "Cayman Shell Company" in the Old Boys' Network to reach 100% offline returns.
      </p>
      <button
        type="button"
        class="scn-Action"
        data-testid="dismiss-offline"
        @click="store.dismissOfflineReport()"
      >
        Pocket the proceeds
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { formatCurrency, formatDuration } from '../utils/format'

const store = useGameStore()
</script>
