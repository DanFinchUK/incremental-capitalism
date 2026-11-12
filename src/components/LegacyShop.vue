<template>
  <section v-if="store.legacyDrawerOpen" class="scn-Drawer" aria-label="Old Boys' Network">
    <div class="scn-DrawerHeader">
      <div>
        <h2>Old Boys' Network — {{ store.legacyAvailable }} unspent Legacy</h2>
        <p class="scn-AutoLine">
          Spending Legacy on perks never lowers your global x{{ store.legacyMultiplier.toFixed(2).replace(/\.00$/, '') }} income multiplier.
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
  </section>
</template>

<script setup lang="ts">
import { LEGACY_PERKS, perkNextCost, type PerkId } from '../data/perks'
import { useGameStore } from '../stores/game'

const emit = defineEmits<{
  (e: 'buy-perk', id: PerkId): void
}>()

const store = useGameStore()

function canBuy(id: PerkId): boolean {
  const cost = perkNextCost(id, store.perks[id])
  return cost !== null && store.legacyAvailable >= cost
}

function buttonText(id: PerkId): string {
  const cost = perkNextCost(id, store.perks[id])
  return cost === null ? 'Maxed out' : `Buy for ${cost} Legacy`
}
</script>
