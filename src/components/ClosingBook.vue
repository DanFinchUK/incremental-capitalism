<template>
  <div class="bk-Stage" data-testid="closing-book" @click.stop="emit('done')">
    <div ref="book" class="bk-Book">
      <div class="bk-Back" aria-hidden="true"></div>
      <div class="bk-Pages" aria-hidden="true"></div>
      <div ref="cover" class="bk-Cover">
        <div class="bk-Inside" aria-hidden="true"></div>
        <div class="bk-Outside">
          <span class="bk-Office">General Register Office</span>
          <span class="bk-Rule" aria-hidden="true"></span>
          <strong class="bk-Name">The {{ surname }} Dynasty</strong>
          <span class="bk-Rule" aria-hidden="true"></span>
          <span class="bk-Detail">{{ generations }} generations</span>
          <span class="bk-Detail">Duke of {{ seat }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// The family's volume of the register, shut on the finished dynasty: the
// cover swings over the pages, lands, and the book is put away
import { onMounted, onUnmounted, ref } from 'vue'
import { playSfx } from '../engine/audio'
import { useGameStore } from '../stores/game'
import { reducedMotion } from '../utils/quillWriter'

defineProps<{ surname: string; seat: string; generations: number }>()
const emit = defineEmits<{ (e: 'done'): void }>()
const store = useGameStore()
const book = ref<HTMLElement | null>(null)
const cover = ref<HTMLElement | null>(null)
let cancelled = false
const timers: ReturnType<typeof setTimeout>[] = []

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => timers.push(setTimeout(resolve, ms)))
}

onMounted(async () => {
  const c = cover.value
  const b = book.value
  // Nothing to animate with, or no wish for movement: straight on
  if (!c || !b || typeof c.animate !== 'function' || reducedMotion()) {
    emit('done')
    return
  }
  await wait(350)
  if (cancelled) return
  // The cover falls shut, slowly at first; the spread closes up to centre
  b.animate([{ transform: 'translateX(50%)' }, { transform: 'translateX(0)' }], {
    duration: 1050,
    easing: 'cubic-bezier(0.55, 0, 0.75, 0.2)',
    fill: 'forwards'
  })
  await c.animate([{ transform: 'rotateY(-176deg)' }, { transform: 'rotateY(-70deg)', offset: 0.6 }, { transform: 'rotateY(0deg)' }], {
    duration: 1050,
    easing: 'cubic-bezier(0.55, 0, 0.75, 0.2)',
    fill: 'forwards'
  }).finished
  if (cancelled) return
  playSfx('bookClose', store.muted)
  b.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(3px)' }, { transform: 'translateY(0)' }], { duration: 180 })
  await wait(1200)
  if (cancelled) return
  await b.animate([{ opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 0, transform: 'translateY(-12px) scale(0.96)' }], {
    duration: 500,
    easing: 'ease-in',
    fill: 'forwards'
  }).finished
  if (!cancelled) emit('done')
})

onUnmounted(() => {
  cancelled = true
  for (const t of timers) clearTimeout(t)
})
</script>

<style scoped>
.bk-Stage {
  --bk-w: min(260px, 45vw);
  position: fixed;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(ellipse 70% 55% at 50% 40%, rgba(255, 196, 110, 0.2), transparent 70%),
    radial-gradient(ellipse at 50% 40%, #4a301c 0%, #24160c 60%, #0d0805 100%);
  animation: bk-fade 0.35s ease both;
  cursor: pointer;
}

.bk-Book {
  position: relative;
  width: var(--bk-w);
  aspect-ratio: 3 / 4;
  perspective: 1600px;
  transform-style: preserve-3d;
  transform: translateX(50%);
}

/* The back board, a little larger than the pages */
.bk-Back {
  position: absolute;
  inset: -4px -6px -4px 0;
  border-radius: 2px 6px 6px 2px;
  background: linear-gradient(90deg, #160508, #3a0f16 12%, #2a0a10);
  box-shadow: 0 30px 50px rgba(0, 0, 0, 0.6);
}

/* The pages, edges showing */
.bk-Pages {
  position: absolute;
  inset: 4px 0 4px 6px;
  border-radius: 0 3px 3px 0;
  background:
    repeating-linear-gradient(180deg, transparent 0 22px, rgba(64, 92, 130, 0.22) 22px 23px),
    linear-gradient(90deg, rgba(120, 80, 20, 0.18), transparent 12%),
    linear-gradient(180deg, #f3e8cb, #e6d3a6);
  box-shadow: inset -3px 0 0 #d9c69a, inset -5px 0 0 #efe2c2, inset -7px 0 0 #d9c69a;
}

.bk-Cover {
  position: absolute;
  inset: -4px -6px -4px 0;
  transform-origin: left center;
  transform-style: preserve-3d;
  transform: rotateY(-176deg);
}

.bk-Outside,
.bk-Inside {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 2px 6px 6px 2px;
}

/* The endpaper, marbled, seen while the book lies open */
.bk-Inside {
  transform: rotateY(180deg);
  background:
    repeating-radial-gradient(circle at 30% 35%, transparent 0 7px, rgba(122, 32, 44, 0.22) 7px 9px),
    repeating-radial-gradient(circle at 75% 70%, transparent 0 9px, rgba(40, 60, 92, 0.2) 9px 11px),
    radial-gradient(ellipse at 20% 30%, rgba(122, 32, 44, 0.45), transparent 40%),
    radial-gradient(ellipse at 70% 60%, rgba(40, 60, 92, 0.4), transparent 45%),
    radial-gradient(ellipse at 40% 85%, rgba(176, 132, 52, 0.4), transparent 40%),
    #e9dcc0;
}

/* Calf leather, gilt-tooled */
.bk-Outside {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 26px 22px 26px 26px;
  text-align: center;
  color: #e9c766;
  background:
    linear-gradient(90deg, rgba(0, 0, 0, 0.45), transparent 10%),
    radial-gradient(ellipse at 40% 30%, #5a1822, #3a0d14 60%, #22070b);
}

/* Two tooled gilt lines round the edge */
.bk-Outside::before,
.bk-Outside::after {
  content: '';
  position: absolute;
  border: 1px solid rgba(214, 169, 60, 0.8);
  border-radius: 2px;
  pointer-events: none;
}

.bk-Outside::before {
  inset: 9px 9px 9px 14px;
}

.bk-Outside::after {
  inset: 13px 13px 13px 18px;
  border-color: rgba(214, 169, 60, 0.45);
}

.bk-Office {
  font-family: 'IM Fell English SC', Georgia, serif;
  font-size: 11px;
  letter-spacing: 0.2em;
  opacity: 0.85;
}

.bk-Name {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-weight: 700;
  font-size: clamp(20px, 5.5vw, 28px);
  line-height: 1.1;
  text-wrap: balance;
  background: linear-gradient(100deg, #b8892a, #f6dd8f 40%, #d6a93c 60%, #f6dd8f);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.bk-Rule {
  width: 60%;
  height: 1px;
  background: linear-gradient(90deg, transparent, #d6a93c, transparent);
}

.bk-Detail {
  font-family: 'IM Fell English', Georgia, serif;
  font-style: italic;
  font-size: 13px;
  line-height: 1.25;
  color: #d8bd77;
}

@keyframes bk-fade {
  from {
    opacity: 0;
  }
}
</style>
