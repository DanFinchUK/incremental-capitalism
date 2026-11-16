<template>
  <div class="ic-Shell" :class="{ 'ic-Shell-phone': phone }">
    <NewsTicker />

    <div class="lyt-Content">
      <div v-if="visibleBanner" class="scn-Milestone" role="status">
        {{ visibleBanner }}
      </div>

      <FloatingPayouts :floats="floats" />
      <!-- On a phone, pop-ups sit in the dock above Get paid, not over the lists.
           Keyed on the layout: a Teleport finds its target only when it mounts,
           so it must remount when the dock (and #dock-events) comes or goes. -->
      <Teleport :key="phone ? 'dock' : 'inline'" to="#dock-events" :disabled="!phone" defer>
        <MarketEvent @claim="handleClaimEvent" @choose="handleScandalChoice" />
      </Teleport>
      <IntroModal />
      <WelcomeModal v-if="!store.introOpen" />
      <ClassModal />
      <LegacyShop @buy-perk="handleBuyPerk" />
      <ConfirmModal
        :mode="activeDialog"
        @close="activeDialog = null"
        @confirm-retire="confirmRetire"
        @confirm-bloodline="confirmNewBloodline"
        @confirm-reset="confirmHardReset"
      />
      <FamilyTreeModal />
      <AchievementsModal />
      <HeirDraftModal />
      <AbdicationModal />
      <HireModal />
      <FavourModal />
      <SettingsModal @reset="handleHardReset" />
      <DisgraceModal />

      <OverviewBar v-if="!phone || phoneTab === 'family'" :phone="phone" @retire="handleRetire" />

      <div class="lyt-Cockpit">
        <aside v-if="!phone || phoneTab === 'family'" class="lyt-CommandPane" aria-label="Command deck">
          <HeroHeader ref="heroRef" :phone="phone" @paid="handleManualClick" @retire="handleRetire" />
          <BossCard />
          <FamilyOffice />
          <SplitsPanel />
          <TradingDesk v-if="phone" />
        </aside>

        <!-- v-show keeps both lists alive, so switching tabs doesn't reload them -->
        <div v-show="!phone || phoneTab !== 'family'" class="lyt-MarketPane">
          <TradingDesk v-if="!phone" />
          <div class="lyt-Columns">
            <section v-show="!phone || phoneTab === 'jobs'" class="lyt-Column" aria-label="Jobs">
              <div class="lyt-Items">
                <div class="lyt-ListHead">
                  <h2 class="scn-ColumnTitle">Jobs</h2>
                  <BuyerControl kind="jobs" />
                  <BulkPicker v-if="phone" />
                </div>
                <ItemCard
                  v-for="row in store.visibleJobs"
                  :key="row.mode === 'revealed' ? `job-${row.item.id}` : row.key"
                  kind="jobs"
                  :row="row"
                  @buy="handleBuyItem"
                />
              </div>
            </section>

            <section v-show="!phone || phoneTab === 'businesses'" class="lyt-Column" aria-label="Businesses">
              <div class="lyt-Items">
                <div class="lyt-ListHead">
                  <h2 class="scn-ColumnTitle">Businesses</h2>
                  <BuyerControl kind="businesses" />
                  <BulkPicker v-if="phone" />
                </div>
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
      </div>
    </div>

    <footer v-if="!phone || phoneTab === 'family'" class="lyt-Footer">
      <span>Incremental Capitalism · Empire &amp; Privilege Edition</span>
      <div class="lyt-FooterActions">
        <button type="button" class="scn-Action scn-Action-outline" data-testid="open-achievements" @click="store.achievementsOpen = true">
          Achievements ({{ store.achievements.length }})
        </button>
        <button type="button" class="scn-Action scn-Action-outline" data-testid="open-new-bloodline" @click="handleNewBloodline">
          New bloodline
        </button>
      </div>
    </footer>

    <MobileDock v-if="phone" ref="dockRef" :tab="phoneTab" @paid="handleManualClick" @tab="switchPhoneTab" @rules="showBossRules" @retire="handleRetire" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { BUSINESSES_BY_ID, JOBS_BY_ID, type ItemKind } from './data/items'
import { itemMilestones } from './engine/economy'
import type { PerkId } from './data/perks'
import { playSfx, setBossMusicIntensity, startBossMusic, stopBossMusic } from './engine/audio'
import { installTapGuard } from './utils/tapGuard'
import { applyRoom } from './utils/applyRoom'
import { useGameStore } from './stores/game'
import { PHONE_QUERY, useMediaQuery } from './utils/useMediaQuery'
import ClassModal from './components/ClassModal.vue'
import ConfirmModal, { type ConfirmDialogMode } from './components/ConfirmModal.vue'
import DisgraceModal from './components/DisgraceModal.vue'
import IntroModal from './components/IntroModal.vue'
import HeirDraftModal from './components/HeirDraftModal.vue'
import FamilyTreeModal from './components/FamilyTreeModal.vue'
import AchievementsModal from './components/AchievementsModal.vue'
import FloatingPayouts, { type FloatParticle } from './components/FloatingPayouts.vue'
import HeroHeader from './components/HeroHeader.vue'
import BossCard from './components/BossCard.vue'
import BulkPicker from './components/BulkPicker.vue'
import MobileDock, { type PhoneTab } from './components/MobileDock.vue'
import SplitsPanel from './components/SplitsPanel.vue'
import FamilyOffice from './components/FamilyOffice.vue'
import ItemCard from './components/ItemCard.vue'
import LegacyShop from './components/LegacyShop.vue'
import MarketEvent from './components/MarketEvent.vue'
import NewsTicker from './components/NewsTicker.vue'
import AbdicationModal from './components/AbdicationModal.vue'
import HireModal from './components/HireModal.vue'
import FavourModal from './components/FavourModal.vue'
import BuyerControl from './components/BuyerControl.vue'
import SettingsModal from './components/SettingsModal.vue'
import OverviewBar from './components/OverviewBar.vue'
import TradingDesk from './components/TradingDesk.vue'
import WelcomeModal from './components/WelcomeModal.vue'
import { noteTap } from './components/victoryLock'

const MAX_ACTIVE_FLOATS = 60

const store = useGameStore()
store.hydrateFromStorage(Date.now())

const heroRef = ref<InstanceType<typeof HeroHeader> | null>(null)
const dockRef = ref<InstanceType<typeof MobileDock> | null>(null)

// On a phone one section shows at a time and Get paid lives in the dock.
// Each tab keeps its own scroll position.
const phone = useMediaQuery(PHONE_QUERY)
const darkScheme = useMediaQuery('(prefers-color-scheme: dark)')

// The family's room sets the page's colours and decoration
watch(
  [() => store.activeRoom, darkScheme],
  ([room, dark]) => applyRoom(document.documentElement, room, dark ? 'dark' : 'light'),
  { immediate: true }
)
const phoneTab = ref<PhoneTab>('jobs')
const tabScroll: Record<PhoneTab, number> = { jobs: 0, businesses: 0, family: 0 }

function switchPhoneTab(next: PhoneTab): void {
  if (next === phoneTab.value) {
    window.scrollTo({ top: 0 })
    return
  }
  tabScroll[phoneTab.value] = window.scrollY
  phoneTab.value = next
  nextTick(() => window.scrollTo({ top: tabScroll[next] }))
}

// The dock's Rules button: open Family & gates at the boss card
function showBossRules(): void {
  if (phoneTab.value !== 'family') tabScroll[phoneTab.value] = window.scrollY
  phoneTab.value = 'family'
  nextTick(() => document.querySelector('[data-testid="boss-card"]')?.scrollIntoView({ block: 'start' }))
}

function payButton(): HTMLButtonElement | null {
  return (phone.value ? dockRef.value?.payButtonRef : heroRef.value?.payButtonRef) ?? null
}
const floats = ref<FloatParticle[]>([])
const visibleBanner = ref<string | null>(null)
const activeDialog = ref<ConfirmDialogMode>(null)

let floatSeq = 0
let rafId: number | null = null
let autoFloatTimer: ReturnType<typeof setInterval> | null = null
let removeTapGuard: (() => void) | null = null
let bannerTimer: ReturnType<typeof setTimeout> | null = null
const pendingTimeouts = new Set<ReturnType<typeof setTimeout>>()

// The store raises sound cues as things happen; play them as they arrive
watch(
  () => store.sfxQueue.length,
  (n) => {
    if (n === 0) return
    for (const c of store.sfxQueue.splice(0)) playSfx(c.kind, store.muted, c.options)
  }
)

// Boss music plays for the length of a fight, unless muted. It builds with
// whichever is further along: the clock or the target.
const bossMusicIntensity = computed(() => {
  const boss = store.nextBoss
  const tracker = store.bossAttempt
  if (boss?.status !== 'active' || !tracker) return null
  const total = boss.def.timeLimitSec * tracker.timeMult
  const timeUsed = total > 0 ? 1 - boss.remainingSec / total : 0
  return Math.max(0, Math.min(1, Math.max(timeUsed, boss.progress)))
})
watch(
  () => [bossMusicIntensity.value !== null && !store.muted, bossMusicIntensity.value] as const,
  ([playing, intensity]) => {
    if (!playing) {
      stopBossMusic()
      return
    }
    startBossMusic(intensity ?? 0)
    setBossMusicIntensity(intensity ?? 0)
  }
)

// The clock ticks through the last ten seconds of a boss fight
watch(
  () => (store.nextBoss?.status === 'active' ? store.nextBoss.remainingSec : null),
  (sec, prev) => {
    if (sec !== null && sec !== prev && sec <= 10 && sec > 0) playSfx('bossTick', store.muted)
  }
)

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
  const amount = store.moneyPerClick
  for (let i = 0; i < count; i++) {
    const handle = setTimeout(() => {
      pendingTimeouts.delete(handle)
      const btn = payButton()
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      spawnFloat(rect.left + Math.random() * rect.width, rect.top + Math.random() * rect.height, amount)
    }, Math.random() * 1000)
    pendingTimeouts.add(handle)
  }
}

function handleManualClick(ev: MouseEvent): void {
  noteTap()
  const earned = store.manualClick(Date.now())
  // The chink climbs as Hustle builds
  const hustle = (store.hustleMultiplier - 1) / Math.max(0.01, store.maxHustle - 1)
  playSfx('click', store.muted, { intensity: hustle })
  let x = ev.clientX
  let y = ev.clientY
  const btn = payButton()
  if (x === 0 && y === 0 && btn) {
    const rect = btn.getBoundingClientRect()
    x = rect.left + rect.width / 2
    y = rect.top + rect.height / 2
  }
  spawnFloat(x, y, earned)
}

function handleBuyItem(kind: ItemKind, id: string): void {
  const res = store.buyItem(kind, id)
  if (res.bought === 0) return
  if (res.hitMilestone || res.promotedClass) {
    // Brighter the further up the item's milestones it has climbed
    const def = kind === 'jobs' ? JOBS_BY_ID[id] : BUSINESSES_BY_ID[id]
    const owned = (kind === 'jobs' ? store.jobsPurchased[id] : store.businessesOwned[id]) ?? 0
    const reached = def ? itemMilestones(def.scaleFactor).filter((m) => owned >= m).length : 1
    playSfx('milestone', store.muted, { intensity: reached / 7 })
  } else {
    playSfx(kind === 'jobs' ? 'buyJob' : 'buyBusiness', store.muted, { count: res.bought })
  }
}

function handleBuyPerk(id: PerkId): void {
  store.buyPerk(id)
}

function handleScandalChoice(option: number): void {
  store.claimMarketEvent(Date.now(), Math.random, option)
  playSfx('scandalPay', store.muted)
}

function handleClaimEvent(): void {
  const outcome = store.claimMarketEvent(Date.now())
  if (outcome === 'golden') {
    playSfx('golden', store.muted)
  } else if (outcome === 'shadyWin') {
    playSfx('shadyWin', store.muted)
  } else if (outcome === 'shadyFreeze') {
    playSfx('shadyFreeze', store.muted)
  }
}

function handleRetire(): void {
  if (!store.canRetire) return
  activeDialog.value = 'retire'
}

function confirmRetire(): void {
  activeDialog.value = null
  if (store.retire(Date.now())) {
    // The club follows the heir draft as the next step, not on top of it
    if (store.legacyAvailable > 0) {
      store.successionShop = 'pending'
    }
  }
}

function handleNewBloodline(): void {
  activeDialog.value = 'bloodline'
}

function confirmNewBloodline(): void {
  activeDialog.value = null
  store.startNewBloodline(Date.now())
}

function handleHardReset(): void {
  activeDialog.value = 'reset'
}

function confirmHardReset(): void {
  activeDialog.value = null
  store.hardReset(Date.now())
}

function onBeforeUnload(): void {
  store.flushAll(Date.now())
}

// Phones rarely fire beforeunload, so also save when the page is hidden
function onVisibilityChange(): void {
  if (document.visibilityState === 'hidden') store.flushAll(Date.now())
}

function frameLoop(): void {
  store.tick(Date.now())
  rafId = window.requestAnimationFrame(frameLoop)
}

onMounted(() => {
  rafId = window.requestAnimationFrame(frameLoop)
  autoFloatTimer = setInterval(scheduleAutoFloats, 1000)
  window.addEventListener('beforeunload', onBeforeUnload)
  window.addEventListener('pagehide', onBeforeUnload)
  document.addEventListener('visibilitychange', onVisibilityChange)
  removeTapGuard = installTapGuard()
})

onUnmounted(() => {
  stopBossMusic()
  removeTapGuard?.()
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
  window.removeEventListener('pagehide', onBeforeUnload)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>
