<template>
  <div v-if="departures.length > 0 || loans.length > 0 || showButton" class="scn-Favours" @click.stop>
    <div v-for="(text, i) in departures" :key="`gone-${i}`" class="scn-FavourRow scn-FavourRow-gone">{{ text }}</div>
    <div
      v-for="(left, i) in loans"
      :key="`help-${i}`"
      class="scn-FavourRow scn-FavourRow-help"
      :class="{ 'scn-FavourRow-ending': left <= 10_000 }"
      role="status"
      data-testid="favour-help"
    >
      Lending you a hand for {{ formatClock(left) }}
    </div>
    <button
      v-if="showButton"
      type="button"
      class="scn-Action scn-FavourButton"
      data-testid="call-in-favour"
      @click="store.callInFavour(kind)"
    >
      {{ buttonLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FavourKind } from '../data/favours'
import { useGameStore } from '../stores/game'
import { formatClock } from '../utils/format'

const props = defineProps<{ kind: FavourKind; itemId: string }>()
const store = useGameStore()

const loans = computed(() => store.favourLoansFor(props.kind, props.itemId))
const departures = computed(() => store.favourDeparturesFor(props.kind, props.itemId))
// Only the bottom card of a list takes a favour
const showButton = computed(() => store.favoursLeft > 0 && store.favourTarget(props.kind) === props.itemId)
// One favour needs no count, the way Buy doesn't say x1
const buttonLabel = computed(() =>
  store.favoursTotal > 1 ? `Call in a favour (${store.favoursLeft}/${store.favoursTotal})` : 'Call in a favour'
)
</script>
