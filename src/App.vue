<template>
  <div class="ic-Shell">
    <NewsTicker />

    <div class="lyt-Content">
      <div v-if="visibleBanner" class="scn-Milestone" role="status">
        {{ visibleBanner }}
      </div>

      <FloatingPayouts :floats="floats" />
      <MarketEvent @claim="handleClaimEvent" />
      <WelcomeModal />

      <OverviewBar @retire="handleRetire" />
      <LegacyShop @buy-perk="handleBuyPerk" />
      <HeroHeader ref="heroRef" @paid="handleManualClick" />

      <div class="lyt-Columns">
        <section class="lyt-Column" aria-label="Jobs">
          <div class="lyt-Items">
            <h2 class="scn-ColumnTitle">Jobs</h2>
            <ItemCard
              v-for="row in store.visibleJobs"
              :key="row.mode === 'revealed' ? `job-${row.item.id}` : row.key"
              kind="jobs"
              :row="row"
              @buy="handleBuyItem"
            />
          </div>
        </section>

        <section class="lyt-Column" aria-label="Businesses">
          <div class="lyt-Items">
            <h2 class="scn-ColumnTitle">Businesses</h2>
            <ItemCard
              v-for="row in store.visibleBusinesses"
              :key="row.mode === 'revealed' ? `biz-${row.item.id}` : row.key"
              kind="businesses"
              :row="row"
              @buy="handleBuyItem"
            />
          </div>
        </section>
      </div>
    </div>

    <footer class="lyt-Footer">
      <span>Incremental Capitalism · Empire &amp; Privilege Edition</span>
      <button type="button" class="scn-Action" @click="handleHardReset">
        Reset game
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import type { ItemKind } from './data/items'
import type { PerkId } from './data/perks'
import { playSfx } from './engine/audio'
import { useGameStore } from './stores/game'
import FloatingPayouts, { type FloatParticle } from './components/FloatingPayouts.vue'
import HeroHeader from './components/HeroHeader.vue'
import ItemCard from './components/ItemCard.vue'
import LegacyShop from './components/LegacyShop.vue'
import MarketEvent from './components/MarketEvent.vue'
import NewsTicker from './components/NewsTicker.vue'
import OverviewBar from './components/OverviewBar.vue'
import WelcomeModal from './components/WelcomeModal.vue'

const MAX_ACTIVE_FLOATS = 60

const store = useGameStore()
store.hydrateFromStorage(Date.now())

const heroRef = ref<InstanceType<typeof HeroHeader> | null>(null)
const floats = ref<FloatParticle[]>([])
const visibleBanner = ref<string | null>(null)

let floatSeq = 0
let rafId: number | null = null
let autoFloatTimer: ReturnType<typeof setInterval> | null = null
let bannerTimer: ReturnType<typeof setTimeout> | null = null
const pendingTimeouts = new Set<ReturnType<typeof setTimeout>>()

watch(
  () => store.bannerMessage,
  (msg) => {
    if (!msg) return
    visibleBanner.value = msg
    if (bannerTimer !== null) {
      clearTimeout(bannerTimer)
    }
    bannerTimer = setTimeout(() => {
      visibleBanner.value = null
      store.bannerMessage = null
    }, 4000)
  }
)

function spawnFloat(x: number, y: number, amount: number): void {
  if (floats.value.length >= MAX_ACTIVE_FLOATS) {
    return
  }
  floatSeq += 1
  const id = floatSeq
  floats.value.push({ id, x, y, amount })
  const handle = setTimeout(() => {
    pendingTimeouts.delete(handle)
    floats.value = floats.value.filter((f) => f.id !== id)
  }, 900)
  pendingTimeouts.add(handle)
}

function scheduleAutoFloats(): void {
  const count = Math.min(store.autoClickers, 30)
  if (count <= 0) return
  const amount = store.baseMoneyPerClick
  for (let i = 0; i < count; i++) {
    const handle = setTimeout(() => {
      pendingTimeouts.delete(handle)
      const btn = heroRef.value?.payButtonRef
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      spawnFloat(rect.left + Math.random() * rect.width, rect.top + Math.random() * rect.height, amount)
    }, Math.random() * 1000)
    pendingTimeouts.add(handle)
  }
}

function handleManualClick(ev: MouseEvent): void {
  const earned = store.manualClick(Date.now())
  playSfx('click', store.muted)
  let x = ev.clientX
  let y = ev.clientY
  if (x === 0 && y === 0 && heroRef.value?.payButtonRef) {
    const rect = heroRef.value.payButtonRef.getBoundingClientRect()
    x = rect.left + rect.width / 2
    y = rect.top + rect.height / 2
  }
  spawnFloat(x, y, earned)
}

function handleBuyItem(kind: ItemKind, id: string): void {
  const res = store.buyItem(kind, id)
  if (res.bought > 0) {
    playSfx(res.hitMilestone || res.promotedClass ? 'milestone' : 'buy', store.muted)
  }
}

function handleBuyPerk(id: PerkId): void {
  if (store.buyPerk(id)) {
    playSfx('milestone', store.muted)
  }
}

function handleClaimEvent(): void {
  const outcome = store.claimMarketEvent(Date.now())
  if (outcome === 'golden' || outcome === 'shadyWin') {
    playSfx('golden', store.muted)
  } else if (outcome === 'shadyFreeze') {
    playSfx('shadyFreeze', store.muted)
  }
}

function handleRetire(): void {
  const gain = store.legacyGain
  if (gain < 1) return
  if (window.confirm(`Retire for +${gain} Legacy? Your cash, jobs and businesses will reset, keeping Legacy, perks and lifetime counts.`)) {
    if (store.retire(Date.now())) {
      playSfx('milestone', store.muted)
    }
  }
}

function handleHardReset(): void {
  if (window.confirm('Reset everything, including Legacy points, perks and lifetime counts?')) {
    store.hardReset(Date.now())
  }
}

function onBeforeUnload(): void {
  store.flushSave(Date.now())
}

function frameLoop(): void {
  store.tick(Date.now())
  rafId = window.requestAnimationFrame(frameLoop)
}

onMounted(() => {
  rafId = window.requestAnimationFrame(frameLoop)
  autoFloatTimer = setInterval(scheduleAutoFloats, 1000)
  window.addEventListener('beforeunload', onBeforeUnload)
})

onUnmounted(() => {
  if (rafId !== null) {
    window.cancelAnimationFrame(rafId)
  }
  if (autoFloatTimer !== null) {
    clearInterval(autoFloatTimer)
  }
  if (bannerTimer !== null) {
    clearTimeout(bannerTimer)
  }
  for (const handle of pendingTimeouts) {
    clearTimeout(handle)
  }
  pendingTimeouts.clear()
  window.removeEventListener('beforeunload', onBeforeUnload)
})
</script>
