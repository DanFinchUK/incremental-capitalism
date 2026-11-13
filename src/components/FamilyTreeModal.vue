<template>
  <div
    v-if="store.familyTreeOpen"
    class="scn-ModalBackdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="family-tree-title"
    data-testid="family-tree"
    @click.self="store.familyTreeOpen = false"
  >
    <div class="scn-Modal scn-Modal-xl">
      <div class="scn-DrawerHeader">
        <div class="scn-ModalTop">
          <span class="scn-ModalKicker scn-ModalKicker-purple">Burke's Peerage, abridged</span>
          <h2 id="family-tree-title">The {{ store.familySurname }} family tree</h2>
        </div>
        <button type="button" class="scn-Action scn-Action-outline" @click="store.familyTreeOpen = false">Close</button>
      </div>

      <ol class="scn-TreeList" reversed>
        <li class="scn-TreeEntry scn-TreeEntry-current">
          <div class="scn-TreeHead">
            <strong>{{ store.heir.name }}</strong>
            <span class="scn-StatHint">Generation {{ store.generation }} · head of the family now</span>
          </div>
          <p class="scn-AutoLine">
            {{ traitName(store.heir.traitId) }} · deepest gate so far: {{ gateName(store.gatesBeaten) }} ·
            {{ formatClock(store.activeGenerationMs) }} played
          </p>
        </li>
        <li v-for="(rec, i) in newestFirst" :key="`${i}-${rec.generation}`" class="scn-TreeEntry">
          <div class="scn-TreeHead">
            <strong>{{ rec.name }}</strong>
            <span class="scn-StatHint">Generation {{ rec.generation }} · +{{ rec.legacyEarned }} Legacy</span>
          </div>
          <p class="scn-AutoLine">
            {{ traitName(rec.traitId) }} · reached {{ gateName(rec.deepestGate) }} · {{ formatClock(rec.activeMs) }} played
          </p>
          <p v-if="rec.advisors.length > 0" class="scn-StatHint">Advisors: {{ rec.advisors.join(', ') }}</p>
          <p v-if="splitText(rec.splits)" class="scn-StatHint" data-testid="tree-splits">Splits: {{ splitText(rec.splits) }}</p>
        </li>
      </ol>
      <p v-if="store.familyTree.length === 0" class="scn-AutoLine">
        The family history starts here. Retire to hand the estate on, and your heirs will be recorded below.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TRAITS_BY_ID } from '../data/heirs'
import { bossForGate } from '../engine/bosses'
import { useGameStore } from '../stores/game'
import { formatClock } from '../utils/format'
import { useEscapeKey } from '../utils/useEscapeKey'

const store = useGameStore()
useEscapeKey(() => store.familyTreeOpen, () => (store.familyTreeOpen = false))

const newestFirst = computed(() => [...store.familyTree].reverse())

function traitName(id: string | null): string {
  return id && TRAITS_BY_ID[id] ? TRAITS_BY_ID[id].name : 'The founder'
}

function splitText(splits: ReadonlyArray<number | null>): string {
  return splits
    .map((ms, gate) => (ms === null || gate === 0 ? null : `G${gate} ${formatClock(ms)}`))
    .filter((x): x is string => x !== null)
    .join(' · ')
}

function gateName(gate: number): string {
  return gate > 0 ? (bossForGate(gate)?.title ?? `gate ${gate}`) : 'no gates yet'
}
</script>
