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
        <span class="scn-ModalKicker scn-ModalKicker-accent">
          Succession · Generation {{ store.generation + 1 }}<template v-if="store.successionShop === 'pending'"> · Step 1 of 2</template>
        </span>
        <h2 id="heir-draft-title">Who inherits the estate?</h2>
      </div>
      <p class="scn-CardMeta">
        The solicitor has read the will. {{ countWord }} {{ pluralSurname(store.familySurname) }} are waiting in the library, each quite
        sure it should be them.
      </p>
      <p class="scn-StatHint" data-testid="heir-rules">
        How inheritance works: an heir's own trait lasts their lifetime. The trait they pass down stays with the bloodline
        until the family elevates.
      </p>
      <div v-if="store.bloodlineTraitPills.length > 0" class="scn-TraitPillRow">
        <span class="scn-StatHint">Current bloodline:</span>
        <span
          v-for="pill in store.bloodlineTraitPills"
          :key="pill.label"
          class="scn-TraitPill"
          :class="{ 'scn-TraitPill-neg': pill.negative }"
        >
          {{ pill.label }}
        </span>
      </div>
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
          <p v-if="choice.inherit" class="scn-HeirInherit" data-testid="heir-inherit">
            <span class="scn-StatHint">Passes down:</span> <strong>{{ choice.inherit.name }}</strong>. {{ choice.inherit.description }}
          </p>
          <div v-if="choice.effect.length > 0" class="scn-TraitPillRow" data-testid="heir-effect">
            <span class="scn-StatHint">With this heir:</span>
            <span
              v-for="pill in choice.effect"
              :key="pill.label"
              class="scn-TraitPill"
              :class="{ 'scn-TraitPill-neg': pill.negative }"
            >
              {{ pill.label }}
            </span>
          </div>
          <button type="button" class="scn-Action scn-Action-accent" @click="store.pickHeir(i)">
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
import { INHERITED_BY_ID, TRAITS_BY_ID } from '../data/heirs'
import { describeHeirEffect } from '../engine/family'
import { useGameStore } from '../stores/game'
import { pluralSurname } from '../utils/format'

const store = useGameStore()
const countWord = computed(() => ['Two', 'Three', 'Four', 'Five'][store.heirChoices.length - 2] ?? String(store.heirChoices.length))

const options = computed(() =>
  store.heirChoices.map((h) => ({
    name: h.name,
    trait: h.traitId ? TRAITS_BY_ID[h.traitId] : null,
    inherit: h.inheritId ? INHERITED_BY_ID[h.inheritId] ?? null : null,
    effect: describeHeirEffect(h)
  }))
)
</script>
