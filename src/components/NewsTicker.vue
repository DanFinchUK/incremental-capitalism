<template>
  <div class="scn-Ticker" role="status" aria-live="polite">
    <span class="scn-TickerTag">Market Wire</span>
    <span class="scn-TickerText">{{ currentHeadline }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { pickHeadline } from '../data/headlines'
import { useGameStore } from '../stores/game'

const store = useGameStore()

const activeBuffKind = computed<string | null>(() => {
  if (store.activeBusinessBuff) return 'businessBuff'
  if (store.activeClickBuff) return 'clickBuff'
  return null
})

const currentHeadline = ref<string>(pickHeadline(0, null))
let timerId: ReturnType<typeof setInterval> | null = null

function rotateHeadline(): void {
  currentHeadline.value = pickHeadline(store.classStatus.current.level, activeBuffKind.value)
}

watch([() => store.classStatus.current.level, activeBuffKind], () => {
  rotateHeadline()
})

onMounted(() => {
  rotateHeadline()
  timerId = setInterval(rotateHeadline, 9000)
})

onUnmounted(() => {
  if (timerId !== null) {
    clearInterval(timerId)
  }
})
</script>
