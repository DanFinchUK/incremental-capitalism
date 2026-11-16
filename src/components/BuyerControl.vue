<template>
  <label v-if="buyer" class="scn-BuyerControl" :data-testid="`buyer-${kind}`" :title="buyer.name">
    <span class="scn-BuyerStats">{{ budgetText }} · {{ buyer.itemTypes }} item{{ buyer.itemTypes === 1 ? '' : 's' }}</span>
    <input
      type="checkbox"
      :checked="!store.buyersPaused[kind]"
      :data-testid="`buyer-toggle-${kind}`"
      @change="store.toggleBuyersPaused(kind)"
    >
    Automate
  </label>
</template>

<script setup lang="ts">
// A list's buyer, beside its heading: how much of your cash they may spend a
// second, how many kinds of item, and whether they're at work
import { computed } from 'vue'
import type { ItemKind } from '../data/items'
import { useGameStore } from '../stores/game'

const props = defineProps<{ kind: ItemKind }>()
const store = useGameStore()
const buyer = computed(() => store.buyers[props.kind])

// What they spend now, and what they'd spend otherwise: stood down, it's
// nothing; sharing with the other buyer, it's less than their own budget
const budgetText = computed(() => {
  const b = buyer.value
  if (!b) return ''
  const pct = (x: number) => `${Math.round(x * 100)}%`
  if (store.buyersPaused[props.kind]) return `Budget 0% (${pct(b.share)} when on)`
  if (b.share < b.ownShare - 0.005) return `Budget ${pct(b.share)} (${pct(b.ownShare)} alone)`
  return `Budget ${pct(b.share)}`
})
</script>
