<template>
  <div
    v-if="store.introOpen"
    class="scn-ModalBackdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="intro-modal-title"
    data-testid="intro-modal"
  >
    <div class="scn-Modal scn-Modal-wide">
      <div class="scn-ModalTop">
        <span class="scn-ModalKicker scn-ModalKicker-purple">
          {{ page.kicker }} · {{ step + 1 }}/{{ INTRO_PAGES.length }}
        </span>
        <h2 id="intro-modal-title">{{ page.title }}</h2>
      </div>

      <p v-for="(para, i) in page.body" :key="i" class="scn-CardMeta">{{ para }}</p>

      <div v-if="page.tip" class="scn-ModalCallout scn-ModalCallout-perk">
        <p>{{ page.tip }}</p>
      </div>

      <div class="scn-IntroDots" aria-hidden="true">
        <span
          v-for="(_, i) in INTRO_PAGES"
          :key="i"
          class="scn-IntroDot"
          :class="{ 'scn-IntroDot-active': i === step }"
        />
      </div>

      <div class="scn-ModalFooter">
        <button
          v-if="!isLast"
          type="button"
          class="scn-Action scn-Action-outline"
          data-testid="intro-skip"
          @click="finish"
        >
          Skip
        </button>
        <button
          v-if="step > 0"
          type="button"
          class="scn-Action scn-Action-outline"
          @click="step -= 1"
        >
          Back
        </button>
        <button
          type="button"
          class="scn-Action scn-Action-purple"
          data-testid="intro-next"
          @click="isLast ? finish() : (step += 1)"
        >
          {{ isLast ? 'Start grafting' : 'Next' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { INTRO_PAGES } from '../data/intro'
import { useGameStore } from '../stores/game'

const store = useGameStore()
const step = ref(0)

const page = computed(() => INTRO_PAGES[step.value])
const isLast = computed(() => step.value === INTRO_PAGES.length - 1)

watch(
  () => store.introOpen,
  (open) => {
    if (open) {
      step.value = 0
    }
  }
)

function finish(): void {
  store.closeIntro()
}
</script>
