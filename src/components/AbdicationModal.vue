<template>
  <div
    v-if="store.siblingChoices.length > 0"
    class="scn-ModalBackdrop scn-ModalBackdrop-top"
    role="dialog"
    aria-modal="true"
    aria-labelledby="abdication-title"
    data-testid="abdication"
    @click.self="store.cancelAbdication()"
  >
    <div class="scn-Modal scn-Modal-xl">
      <div class="scn-ModalTop">
        <span class="scn-ModalKicker scn-ModalKicker-purple">Abdication · Generation {{ store.generation }}</span>
        <h2 id="abdication-title">Who steps in for {{ firstName }}?</h2>
      </div>
      <p class="scn-CardMeta">
        {{ store.heir.name }} steps aside, taking both their traits with them. A younger sibling runs the same estate from
        here: this generation carries on and no Legacy is paid. There is only one spare, so this can happen once a
        generation, and the spare is never quite as impressive as the heir.
      </p>
      <div class="scn-HeirGrid">
        <article
          v-for="(choice, i) in options"
          :key="choice.name"
          class="scn-HeirCard scn-HeirCard-common"
          data-testid="sibling-option"
        >
          <span class="scn-MarketEventTag">Younger sibling</span>
          <h3 class="scn-HeirName">{{ choice.name }}</h3>
          <strong class="scn-HeirTrait">{{ choice.trait?.name }}</strong>
          <p class="scn-AutoLine">{{ choice.trait?.description }}</p>
          <p v-if="choice.inherit" class="scn-HeirInherit">
            <span class="scn-StatHint">Passes down:</span> <strong>{{ choice.inherit.name }}</strong>. {{ choice.inherit.description }}
          </p>
          <div v-if="choice.effect.length > 0" class="scn-TraitPillRow">
            <span class="scn-StatHint">With this sibling:</span>
            <span
              v-for="pill in choice.effect"
              :key="pill.label"
              class="scn-TraitPill"
              :class="{ 'scn-TraitPill-neg': pill.negative }"
            >
              {{ pill.label }}
            </span>
          </div>
          <button type="button" class="scn-Action scn-Action-purple" data-testid="pick-sibling" @click="store.pickSibling(i)">
            Hand over the keys
          </button>
        </article>
      </div>
      <div class="scn-ModalFooter">
        <button type="button" class="scn-Action scn-Action-outline" data-testid="cancel-abdication" @click="store.cancelAbdication()">
          {{ firstName }} stays on
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { INHERITED_BY_ID, TRAITS_BY_ID } from '../data/heirs'
import { describeHeirEffect } from '../engine/family'
import { useGameStore } from '../stores/game'
import { useEscapeKey } from '../utils/useEscapeKey'

const store = useGameStore()
useEscapeKey(() => store.siblingChoices.length > 0, () => store.cancelAbdication())

const firstName = computed(() => store.heir.name.split(' ')[0])

const options = computed(() =>
  store.siblingChoices.map((h) => ({
    name: h.name,
    trait: h.traitId ? TRAITS_BY_ID[h.traitId] : null,
    inherit: h.inheritId ? INHERITED_BY_ID[h.inheritId] ?? null : null,
    effect: describeHeirEffect(h)
  }))
)
</script>
