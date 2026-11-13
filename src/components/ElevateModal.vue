<template>
  <div
    v-if="open"
    class="scn-ModalBackdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="elevate-title"
    data-testid="elevate-modal"
    @click.self="emit('close')"
  >
    <div class="scn-Modal scn-Modal-wide">
      <div class="scn-ModalTop">
        <span class="scn-ModalKicker scn-ModalKicker-purple">Letters Patent</span>
        <h2 id="elevate-title">Elevation to the Lords</h2>
      </div>
      <p class="scn-CardMeta">
        A grateful nation (or at least a grateful party treasurer) offers the {{ store.familySurname }} family a seat in the
        Lords. The new line starts afresh: Legacy, perks and the family office are given up, and even the PA retires.
        The family name, its history, achievements and best times all carry on.
      </p>
      <div class="scn-ModalGrid">
        <div class="scn-StatBox">
          <div class="scn-DataTitle">Titles</div>
          <div class="scn-DataValue">{{ store.titles }} → <span class="scn-DeltaInline">{{ nextTitles }}</span></div>
        </div>
        <div class="scn-StatBox">
          <div class="scn-DataTitle">Rank</div>
          <div class="scn-DataValue">{{ peerageRank(nextTitles) }}</div>
        </div>
      </div>
      <div class="scn-ModalCallout scn-ModalCallout-perk">
        <p>Every title adds 50% to all income, for good. One title adds an office seat, two bring a fourth heir to choose from, three make Legacy worth 50% more, and five push automation further.</p>
      </div>
      <div class="scn-ModalFooter">
        <button type="button" class="scn-Action scn-Action-outline" @click="emit('close')">Not yet</button>
        <button type="button" class="scn-Action scn-Action-purple" data-testid="confirm-elevate" @click="confirm">
          Accept the peerage
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { peerageRank } from '../engine/peerage'
import { useGameStore } from '../stores/game'
import { useEscapeKey } from '../utils/useEscapeKey'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const store = useGameStore()
useEscapeKey(() => props.open, () => emit('close'))
const nextTitles = computed(() => store.titles + store.titlesOnElevation)

function confirm(): void {
  store.elevateToLords()
  emit('close')
}
</script>
