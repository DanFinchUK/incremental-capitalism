<template>
  <div
    v-if="store.legacyDrawerOpen"
    class="scn-ModalBackdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="legacy-modal-title"
    @click.self="store.legacyDrawerOpen = false"
  >
    <div class="scn-Modal scn-Modal-xl" data-testid="legacy-modal">
      <div class="scn-DrawerHeader">
        <div>
          <span class="scn-ModalKicker scn-ModalKicker-purple">Private Members' Club</span>
          <h2 id="legacy-modal-title">Old Boys' Network — {{ store.legacyAvailable }} unspent Legacy</h2>
          <p class="scn-AutoLine">
            Spending Legacy on perks never lowers your global x{{ formatMultiplier(store.legacyMultiplier) }} income multiplier.
          </p>
        </div>
        <button type="button" class="scn-Action scn-Action-outline" @click="store.legacyDrawerOpen = false">
          Close
        </button>
      </div>

      <div class="scn-PerkGrid">
        <div v-for="perk in LEGACY_PERKS" :key="perk.id" class="scn-PerkCard">
          <div>
            <div class="scn-CardHeader">
              <h4 class="scn-CardTitle">
                {{ perk.label }}
                ({{ store.perks[perk.id] }}<span v-if="perk.maxRank !== null">/{{ perk.maxRank }}</span>)
              </h4>
            </div>
            <p class="scn-PerkEffect">{{ perk.effectSummary(store.perks[perk.id]) }}</p>
            <p class="scn-AutoLine">{{ perk.description }}</p>
          </div>

          <div>
            <button
              type="button"
              class="scn-Action"
              :disabled="!canBuy(perk.id)"
              @click="emit('buy-perk', perk.id)"
            >
              {{ buttonText(perk.id) }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { LEGACY_PERKS, perkNextCost, type PerkId } from '../data/perks'
import { useGameStore } from '../stores/game'
import { formatMultiplier } from '../utils/format'

const emit = defineEmits<{
  (e: 'buy-perk', id: PerkId): void
}>()

const store = useGameStore()

function canBuy(id: PerkId): boolean {
  if (store.legacyPoints < 1) {
    return false
  }
  const cost = perkNextCost(id, store.perks[id])
  return cost !== null && store.legacyAvailable >= cost
}

function buttonText(id: PerkId): string {
  const cost = perkNextCost(id, store.perks[id])
  if (cost === null) {
    return 'Maxed out'
  }
  if (cost === 0) {
    return store.legacyPoints >= 1 ? 'Claim free intern' : 'Needs 1 Legacy'
  }
  return `Buy for ${cost} Legacy`
}

function onKeyDown(ev: KeyboardEvent): void {
  if (store.legacyDrawerOpen && ev.key === 'Escape') {
    store.legacyDrawerOpen = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
})
</script>
