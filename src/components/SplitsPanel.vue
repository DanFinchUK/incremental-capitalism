<template>
  <section v-if="rows.length > 0" class="scn-SplitsPanel" data-testid="splits-panel" aria-label="Split times">
    <h3 class="scn-DataTitle">Splits this generation</h3>
    <table class="scn-SplitsTable">
      <thead>
        <tr>
          <th scope="col">Gate</th>
          <th scope="col">Now</th>
          <th scope="col">Best</th>
          <th scope="col">+/-</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.gate">
          <th scope="row">{{ row.title }}</th>
          <td>{{ row.current === null ? '-' : formatClock(row.current) }}</td>
          <td>{{ row.best === null ? '-' : formatClock(row.best) }}</td>
          <td>
            <span v-if="row.delta !== null" :class="row.delta <= 0 ? 'scn-SplitAhead' : 'scn-SplitBehind'">{{ formatClock(row.delta, true) }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BOSSES } from '../data/bosses'
import { splitDelta } from '../engine/splits'
import { useGameStore } from '../stores/game'
import { formatClock } from '../utils/format'

const store = useGameStore()

// Gates reached this generation, plus any with a best time, so the player
// can see the split they are chasing next.
const rows = computed(() =>
  BOSSES.filter((b) => store.splits[b.gate] != null || store.bestSplits[b.gate] != null).map((b) => {
    const current = store.splits[b.gate] ?? null
    const best = store.bestSplits[b.gate] ?? null
    return { gate: b.gate, title: b.title, current, best, delta: splitDelta(current, best) }
  })
)
</script>
