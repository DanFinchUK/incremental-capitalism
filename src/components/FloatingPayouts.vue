<template>
  <div aria-hidden="true">
    <div
      v-for="f in floats"
      :key="f.id"
      class="scn-Float"
      :style="{ left: `${f.x}px`, top: `${f.y}px` }"
    >
      +{{ formatCurrency(f.amount) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency } from '../utils/format'

export interface FloatParticle {
  id: number
  x: number
  y: number
  amount: number
}

defineProps<{
  floats: ReadonlyArray<FloatParticle>
}>()
</script>
