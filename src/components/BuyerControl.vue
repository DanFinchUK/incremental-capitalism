<template>
  <label v-if="buyer" class="scn-BuyerControl" :data-testid="`buyer-${kind}`" :title="buyer.name">
    <span class="scn-BuyerStats">Budget {{ Math.round(buyer.share * 100) }}% · {{ buyer.itemTypes }} item{{ buyer.itemTypes === 1 ? '' : 's' }}</span>
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
</script>
