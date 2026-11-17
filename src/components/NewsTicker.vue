<template>
  <div class="scn-Ticker" role="status" aria-live="polite">
    <span class="scn-TickerTag">Market Wire</span>
    <span ref="viewportRef" class="scn-TickerViewport">
      <!-- A headline too long for the bar glides sideways to its end, so none is cut short -->
      <span
        :key="currentHeadline"
        ref="textRef"
        class="scn-TickerText"
        :class="{ 'scn-TickerText-scroll': shiftPx > 0, 'scn-TickerText-fading': fading }"
        :style="shiftPx > 0 ? { '--ticker-shift': `-${shiftPx}px`, '--ticker-travel': `${travelMs}ms`, '--ticker-delay': `${HOLD_START_MS}ms` } : undefined"
        data-testid="ticker-text"
      >{{ currentHeadline }}</span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { pickHeadline } from '../data/headlines'
import { useGameStore } from '../stores/game'

// Reading pace for the sideways scroll, and how long a headline rests
// before it starts moving and after it reaches its end
const SCROLL_PX_PER_SEC = 45
const HOLD_START_MS = 1500
const HOLD_END_MS = 2500
const MIN_SHOW_MS = 9000
// Each headline fades out before the next fades in
const FADE_MS = 450

const store = useGameStore()
const viewportRef = ref<HTMLElement | null>(null)
const textRef = ref<HTMLElement | null>(null)
const shiftPx = ref(0)
const fading = ref(false)

const activeBuffKind = computed<string | null>(() => {
  if (store.activeBusinessBuff) return 'businessBuff'
  if (store.activeClickBuff) return 'clickBuff'
  return null
})

const currentHeadline = ref<string>(pickHeadline(0, null))
// Time spent gliding, and the whole show: rest, glide, rest
const travelMs = computed(() => (shiftPx.value / SCROLL_PX_PER_SEC) * 1000)
const scrollMs = computed(() => HOLD_START_MS + travelMs.value + HOLD_END_MS)
let timerId: ReturnType<typeof setTimeout> | null = null

async function measure(): Promise<void> {
  await nextTick()
  const viewport = viewportRef.value
  const text = textRef.value
  shiftPx.value = viewport && text ? Math.max(0, Math.ceil(text.scrollWidth - viewport.clientWidth)) : 0
}

function schedule(): void {
  if (timerId !== null) clearTimeout(timerId)
  // A long headline stays up until it has scrolled to its end and rested
  timerId = setTimeout(rotateHeadline, Math.max(MIN_SHOW_MS, shiftPx.value > 0 ? scrollMs.value : 0))
}

function rotateHeadline(): void {
  if (timerId !== null) clearTimeout(timerId)
  fading.value = true
  timerId = setTimeout(async () => {
    currentHeadline.value = pickHeadline(store.classStatus.current.level, activeBuffKind.value)
    fading.value = false
    await measure()
    schedule()
  }, FADE_MS)
}

watch([() => store.classStatus.current.level, activeBuffKind], () => {
  rotateHeadline()
})

onMounted(() => {
  rotateHeadline()
})

onUnmounted(() => {
  if (timerId !== null) clearTimeout(timerId)
})
</script>
