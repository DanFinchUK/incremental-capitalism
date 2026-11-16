<template>
  <div
    v-if="store.menuOpen"
    class="scn-ModalBackdrop scn-MenuBackdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="menu-title"
    data-testid="main-menu"
  >
    <div class="scn-Modal scn-Menu">
      <div class="scn-MenuTop">
        <h1 id="menu-title">Incremental Capitalism</h1>
        <p class="scn-StatHint">A dynasty in nine gates and five titles</p>
      </div>

      <template v-if="!confirming">
        <nav class="scn-MenuNav">
          <button type="button" class="scn-Action scn-Action-accent" data-testid="menu-continue" @click="store.closeMenu()">
            {{ fresh ? 'Begin' : 'Continue' }}
            <small>{{ continueLine }}</small>
          </button>
          <button v-if="!fresh" type="button" class="scn-Action scn-Action-outline" data-testid="menu-new-dynasty" @click="newDynasty">
            Found a new dynasty
          </button>
          <button type="button" class="scn-Action scn-Action-outline" data-testid="menu-hall" @click="store.hallOpen = true">
            Hall of Dynasties
            <small v-if="best">Best: the {{ pluralSurname(best.surname) }}, {{ formatDuration(best.activeMs / 1000) }}</small>
          </button>
          <button type="button" class="scn-Action scn-Action-outline" data-testid="menu-how-to-play" @click="howToPlay">How to play</button>
          <button type="button" class="scn-Action scn-Action-outline" data-testid="menu-settings" @click="store.settingsOpen = true">
            Settings
          </button>
        </nav>
      </template>

      <div v-else class="scn-ModalCallout" data-testid="menu-confirm-abandon">
        <p>
          The {{ pluralSurname(store.familySurname) }} are {{ formatDuration(store.dynastyMs / 1000) }} into their climb. A new
          family starts from nothing, and an unfinished dynasty doesn't go in the Hall.
        </p>
        <div class="scn-ModalFooter">
          <button type="button" class="scn-Action scn-Action-outline" @click="confirming = false">Back</button>
          <button type="button" class="scn-Action scn-Action-accent" data-testid="menu-confirm-new-dynasty" @click="abandon">
            Abandon them
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// The way in: carry on with the family, start another, look round the Hall,
// read the rules or change the settings. The game waits behind it.
import { computed, ref } from 'vue'
import { bestDynasty } from '../engine/hall'
import { peerageRank } from '../engine/peerage'
import { useGameStore } from '../stores/game'
import { formatDuration, pluralSurname } from '../utils/format'

const store = useGameStore()
const confirming = ref(false)
const best = computed(() => bestDynasty(store.hall))

// Nothing played yet: there's no family to carry on, only one to begin
const fresh = computed(() => !store.introSeen && store.generation === 1 && store.familyTree.length === 0)

const continueLine = computed(() => {
  if (fresh.value) return `The ${pluralSurname(store.familySurname)} enter the market`
  if (store.dynastyComplete) return `The ${pluralSurname(store.familySurname)} made Duke`
  const rank = store.titles > 0 ? ` · ${peerageRank(store.titles)}` : ''
  return `The ${pluralSurname(store.familySurname)} · generation ${store.generation}${rank} · ${formatDuration(store.dynastyMs / 1000)}`
})

// A finished dynasty has its own way on, in the finale; an unfinished one
// is abandoned, after asking
function newDynasty(): void {
  if (store.dynastyComplete) {
    store.closeMenu()
  } else {
    confirming.value = true
  }
}

function abandon(): void {
  confirming.value = false
  store.abandonDynasty()
  store.closeMenu()
}

function howToPlay(): void {
  store.closeMenu()
  store.openIntro()
}
</script>
