<template>
  <div
    v-if="open"
    class="scn-ModalBackdrop scn-ModalBackdrop-top"
    role="dialog"
    aria-modal="true"
    aria-labelledby="hire-title"
    data-testid="hire-modal"
  >
    <div class="scn-Modal scn-Modal-xl">
      <div class="scn-ModalTop">
        <span class="scn-ModalKicker scn-ModalKicker-accent">Introductions</span>
        <h2 id="hire-title">Who joins the family office?</h2>
      </div>
      <p class="scn-CardMeta">
        Word of the win has reached the right people, and some of them would like to be introduced. They are waiting in
        the drawing room with their CVs, and won't leave until you take someone on or send the lot packing.
      </p>
      <HeadhunterOffer :locked="lock.locked.value" :lock-seconds="lock.secondsLeft.value" />
    </div>
  </div>
</template>

<script setup lang="ts">
// The only place to hire. It opens whenever the headhunter has a shortlist
// and nothing more pressing is on screen, and stays until you hire or pass.
import { computed } from 'vue'
import HeadhunterOffer from './HeadhunterOffer.vue'
import { useVictoryLock } from './victoryLock'
import { useGameStore } from '../stores/game'

const store = useGameStore()

// Waits its turn behind anything else on screen: the intro, the report from
// time away, the victory screen and the family's other choices
const open = computed(
  () =>
    store.headhunterOffer.length > 0 &&
    !store.introOpen &&
    store.offlineReport === null &&
    !store.classModalOpen &&
    !store.familyTreeOpen &&
    !store.achievementsOpen &&
    store.heirChoices.length === 0 &&
    store.siblingChoices.length === 0 &&
    store.disgraceReport === null
)

// It can open the moment a fight is won, so stray taps from the fight are
// ignored for a moment
const lock = useVictoryLock(() => open.value)
</script>
