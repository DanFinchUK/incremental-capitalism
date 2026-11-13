<template>
  <div
    v-if="report"
    class="scn-ModalBackdrop scn-ModalBackdrop-top"
    role="dialog"
    aria-modal="true"
    aria-labelledby="disgrace-modal-title"
    data-testid="disgrace-modal"
  >
    <div class="scn-Modal scn-Modal-wide scn-Modal-danger">
      <div class="scn-ModalTop">
        <span class="scn-ModalKicker scn-ModalKicker-danger">Social Ruin · End of the Bloodline</span>
        <h2 id="disgrace-modal-title">The {{ report.familySurname }} name is finished</h2>
      </div>

      <p class="scn-VictoryStory">{{ report.disgraceText }}</p>

      <div class="scn-ModalCallout scn-ModalCallout-danger">
        <div><strong>{{ report.heirName }}</strong> (Generation {{ report.generation }}) fell at {{ report.bossTitle }}.</div>
        <div>Peak gate reached: {{ report.deepestGate }} / 9 · {{ report.legacyLost }} Legacy swept away.</div>
      </div>

      <p class="scn-AutoLine">
        Achievements, Peerage titles and best split times endure. A fresh founder awaits.
      </p>

      <div class="scn-ModalFooter">
        <button
          type="button"
          class="scn-Action scn-Action-purple"
          data-testid="dismiss-disgrace"
          @click="store.dismissDisgrace()"
        >
          Found a new bloodline
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { useEscapeKey } from '../utils/useEscapeKey'

const store = useGameStore()
const report = computed(() => store.disgraceReport)
useEscapeKey(() => report.value !== null, () => store.dismissDisgrace())
</script>
