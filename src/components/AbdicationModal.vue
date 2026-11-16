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
        <span class="scn-ModalKicker scn-ModalKicker-accent">Abdication · Generation {{ store.generation }}</span>
        <h2 id="abdication-title">Who steps in for {{ firstName }}?</h2>
      </div>
      <p class="scn-CardMeta">
        {{ store.heir.name }} has decided the family firm isn't for them after all, and is off to find themselves
        somewhere warm. Two younger siblings have offered to step in. Neither is quite as impressive as the heir, and
        both of them know it.
      </p>
      <p class="scn-StatHint" data-testid="abdication-rules">
        How abdication works: both of {{ firstName }}'s traits leave with them. The estate and the classes this generation
        has climbed stay, no Legacy is paid, and it can happen once a generation.
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
          <p class="scn-AutoLine">{{ store.wording(choice.trait?.description ?? '') }}</p>
          <p v-if="choice.inherit" class="scn-HeirInherit">
            <span class="scn-StatHint">Passes down:</span> <strong>{{ choice.inherit.name }}</strong>. {{ store.wording(choice.inherit.description) }}
          </p>
          <div v-if="choice.effect.length > 0" class="scn-TraitPillRow">
            <span class="scn-StatHint">With this sibling:</span>
            <span
              v-for="pill in choice.effect"
              :key="pill.label"
              class="scn-TraitPill"
              :class="{ 'scn-TraitPill-neg': pill.negative }"
            >
              {{ store.wording(pill.label) }}
            </span>
          </div>
          <button type="button" class="scn-Action scn-Action-accent" data-testid="pick-sibling" @click="store.pickSibling(i)">
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
