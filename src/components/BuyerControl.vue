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

// The household purse they spend from, or nothing while stood down
const budgetText = computed(() => {
  const b = buyer.value
  if (!b) return ''
  const pct = (x: number) => `${Math.round(x * 100)}%`
  if (store.buyersPaused[props.kind]) return `Budget 0% (${pct(b.share)} when on)`
  return `Budget ${pct(b.share)}`
})
</script>
