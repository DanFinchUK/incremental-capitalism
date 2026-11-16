<template>
  <div
    v-if="store.favourDialogOpen && store.favourOffer.length > 0"
    class="scn-ModalBackdrop scn-ModalBackdrop-top"
    role="dialog"
    aria-modal="true"
    aria-labelledby="favour-title"
    data-testid="favour-modal"
    @click.self="store.closeFavourDialog()"
  >
    <div class="scn-Modal scn-Modal-xl">
      <div class="scn-ModalTop">
        <span class="scn-ModalKicker scn-ModalKicker-accent">Old School Tie</span>
        <h2 id="favour-title">Calling in a favour</h2>
      </div>
      <p class="scn-CardMeta">
        A word in the right ear, over a long lunch. For three minutes Britain will run like it does in the brochures, and
        it so happens the changes suit you.
      </p>
      <p class="scn-StatHint">Each lasts 3 minutes, and favours stack. Closing this keeps your favour for later.</p>
      <div class="scn-HeirGrid">
        <article v-for="(o, i) in store.favourOffer" :key="o.def.id" class="scn-HeirCard" data-testid="favour-option">
          <h3 class="scn-HeirName">{{ o.def.title }}</h3>
          <strong class="scn-HeirTrait">{{ store.wording(o.def.effectText) }}</strong>
          <p class="scn-StatHint">About +{{ Math.round(o.value * 100) }}% income right now</p>
          <button type="button" class="scn-Action scn-Action-accent" @click="store.chooseFavour(i)">Make it happen</button>
        </article>
      </div>
      <div class="scn-ModalFooter">
        <button type="button" class="scn-Action scn-Action-outline" @click="store.closeFavourDialog()">Not yet</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Old School Tie: three national events to choose from, weighted to what
// would help the family. Opened from the Call in a favour button.
import { useGameStore } from '../stores/game'
import { useEscapeKey } from '../utils/useEscapeKey'

const store = useGameStore()
useEscapeKey(() => store.favourDialogOpen, () => store.closeFavourDialog())
</script>
