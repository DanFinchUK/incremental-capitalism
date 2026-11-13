<template>
  <div
    v-if="store.heirChoices.length > 0"
    class="scn-ModalBackdrop scn-ModalBackdrop-top"
    role="dialog"
    aria-modal="true"
    aria-labelledby="heir-draft-title"
    data-testid="heir-draft"
  >
    <div class="scn-Modal scn-Modal-xl">
      <div class="scn-ModalTop">
        <span class="scn-ModalKicker scn-ModalKicker-purple">Succession · Generation {{ store.generation + 1 }}</span>
        <h2 id="heir-draft-title">Who inherits the estate?</h2>
      </div>
      <p class="scn-CardMeta">
        {{ countWord }} heirs, one family firm. Each brings a quirk that bends the rules for their whole generation.
      </p>
      <div class="scn-HeirGrid">
        <article
          v-for="(choice, i) in options"
          :key="choice.name"
          class="scn-HeirCard"
          :class="`scn-HeirCard-${choice.trait?.rarity ?? 'common'}`"
          data-testid="heir-option"
        >
          <span class="scn-MarketEventTag">{{ choice.trait ? RARITY_LABELS[choice.trait.rarity] : 'Founder' }}</span>
          <h3 class="scn-HeirName">{{ choice.name }}</h3>
          <strong class="scn-HeirTrait">{{ choice.trait?.name }}</strong>
          <p class="scn-AutoLine">{{ choice.trait?.description }}</p>
          <button type="button" class="scn-Action scn-Action-purple" @click="store.pickHeir(i)">
            Hand over the keys
          </button>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RARITY_LABELS } from '../data/events'
import { TRAITS_BY_ID } from '../data/heirs'
import { useGameStore } from '../stores/game'

const store = useGameStore()
const countWord = computed(() => ['Two', 'Three', 'Four', 'Five'][store.heirChoices.length - 2] ?? String(store.heirChoices.length))

const options = computed(() =>
  store.heirChoices.map((h) => ({ name: h.name, trait: h.traitId ? TRAITS_BY_ID[h.traitId] : null }))
)
</script>
