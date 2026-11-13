<template>
  <div
    v-if="store.classModalOpen"
    class="scn-ModalBackdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="class-modal-title"
    @click.self="store.closeClassModal()"
  >
    <div class="scn-Modal scn-Modal-xl" data-testid="class-modal">
      <div class="scn-DrawerHeader">
        <div class="scn-ModalTop">
          <span class="scn-ModalKicker scn-ModalKicker-purple">
            {{ victory ? `Gate ${victory.boss.gate} of 9 beaten` : celebratedDef ? 'New Lifetime Milestone' : 'The Great British Class Survey' }}
          </span>
          <h2 id="class-modal-title">
            <template v-if="victory">{{ victory.boss.title }}: won</template>
            <template v-else>
              {{ celebratedDef ? `Your new class: ${celebratedDef.label}` : `British Class Pyramid (${store.highestClassReached + 1}/${SOCIAL_CLASSES.length} unlocked)` }}
            </template>
          </h2>
        </div>
        <button v-if="!hireBlocksClose" type="button" class="scn-Action scn-Action-outline" @click="store.closeClassModal()">
          Close
        </button>
      </div>

      <template v-if="victory">
        <p class="scn-VictoryStory">{{ victory.boss.victoryText }}</p>
        <p class="scn-StatHint" data-testid="victory-time">
          Won in {{ formatClock(victory.killMs) }}, {{ formatClock(victory.splitMs) }} into this generation
        </p>
      </template>

      <div v-if="celebratedDef" class="scn-ModalCallout scn-ModalCallout-perk">
        <div v-if="victory">Your new class: <strong>{{ celebratedDef.label }}</strong></div>
        <div><strong>{{ celebratedDef.perkSummary }}</strong></div>
        <div>{{ celebratedDef.initiationNote }}</div>
      </div>

      <ul v-if="victory" class="scn-VictoryUnlocks" data-testid="victory-unlocks">
        <li v-if="victory.newJobs > 0 || victory.newBusinesses > 0">
          Now open: {{ unlockText }}
        </li>
        <li v-if="victory.nextBoss">
          Next: {{ victory.nextBoss.title }}, at {{ formatCurrency(victory.nextThreshold) }} net worth.
        </li>
        <li v-if="victory.canRetireNow">
          Retire now for +{{ victory.legacyNow }} Legacy<template v-if="victory.nextBoss">, or beat {{ victory.nextBoss.title }} first for +{{ victory.legacyNext }}</template>.
        </li>
        <li v-else-if="victory.nextBoss">
          Beat Gate {{ store.minRetireGate }} to unlock retirement (+{{ victory.legacyNext }} Legacy at {{ victory.nextBoss.title }}).
        </li>
      </ul>

      <div v-if="victory && store.headhunterOffer.length > 0" data-testid="victory-headhunter">
        <HeadhunterOffer :locked="lock.locked.value" :lock-seconds="lock.secondsLeft.value" />
      </div>

      <details class="scn-PyramidFold" data-testid="class-pyramid" :open="!victory">
        <summary v-if="victory">Class pyramid</summary>
      <div class="scn-PyramidList">
        <div
          v-for="cls in pyramidRungs"
          :key="cls.level"
          class="scn-PyramidRung"
          :class="{
            'scn-PyramidRung-current': cls.level === store.classStatus.current.level,
            'scn-PyramidRung-celebrated': cls.level === store.celebratedClassLevel,
            'scn-PyramidRung-mystery': cls.level > store.highestClassReached + 1
          }"
        >
          <template v-if="cls.level <= store.highestClassReached">
            <div class="scn-PyramidHeader">
              <div class="scn-PyramidTitleRow">
                <span class="scn-PyramidTier">Tier {{ cls.level }}</span>
                <strong class="scn-PyramidName">{{ cls.label }}</strong>
                <span v-if="cls.level === store.celebratedClassLevel" class="scn-NextTag">Newly unlocked</span>
                <span v-else-if="cls.level === store.classStatus.current.level" class="scn-MilestoneBadge">Current</span>
              </div>
              <span class="scn-PyramidReq">{{ thresholdLabel(cls.threshold) }}</span>
            </div>
            <div class="scn-PyramidPerk">{{ cls.perkSummary }}</div>
            <p class="scn-AutoLine">{{ cls.description }}</p>
            <p class="scn-PyramidGift">{{ cls.initiationNote }}</p>
          </template>

          <template v-else-if="cls.level === store.highestClassReached + 1">
            <div class="scn-PyramidHeader">
              <div class="scn-PyramidTitleRow">
                <span class="scn-PyramidTier">Tier {{ cls.level }}</span>
                <strong class="scn-PyramidName">{{ cls.label }}</strong>
                <span class="scn-MilestoneBadge">Next target</span>
              </div>
              <span class="scn-PyramidReq">Requires {{ thresholdLabel(cls.threshold) }} net worth</span>
            </div>
            <div class="scn-PyramidPerk">{{ cls.perkSummary }}</div>
            <p class="scn-AutoLine">Reach {{ thresholdLabel(cls.threshold) }} net worth in a single run to join this circle.</p>
          </template>

          <template v-else>
            <div class="scn-PyramidHeader">
              <div class="scn-PyramidTitleRow">
                <span class="scn-PyramidTier">Tier {{ cls.level }}</span>
                <strong class="scn-PyramidName">???</strong>
              </div>
              <span class="scn-PyramidReq">Requires {{ thresholdLabel(cls.threshold) }} net worth</span>
            </div>
            <p class="scn-AutoLine">Privilege: ???. Climb higher on the social ladder to reveal this tier.</p>
          </template>
        </div>
      </div>
      </details>

      <div class="scn-ModalFooter">
        <p v-if="hireBlocksClose" class="scn-AutoLine">Hire a candidate or pass above to carry on.</p>
        <button
          v-else
          type="button"
          class="scn-Action scn-Action-purple"
          @click="store.closeClassModal()"
        >
          {{ victory ? 'Back to work' : celebratedDef ? 'Assume your rightful place' : 'Back to the market' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import HeadhunterOffer from './HeadhunterOffer.vue'
import { useVictoryLock } from './victoryLock'
import { SOCIAL_CLASSES } from '../data/classes'
import { BUSINESSES, JOBS } from '../data/items'
import { bossForGate, gateThreshold, itemCostCeiling, legacyForDepth } from '../engine/bosses'
import { useGameStore } from '../stores/game'
import { formatClock, formatCurrency } from '../utils/format'

const store = useGameStore()

const pyramidRungs = computed(() => [...SOCIAL_CLASSES].reverse())

const celebratedDef = computed(() =>
  store.celebratedClassLevel !== null
    ? (SOCIAL_CLASSES[store.celebratedClassLevel] ?? null)
    : null
)

// The boss just beaten for the first time, while its celebration is open
// Stray taps from the fight are ignored for a moment after the win
const lock = useVictoryLock(() => store.classModalOpen && store.lastVictory?.firstTime === true && store.celebratedClassLevel === store.lastVictory.gate)

// The victory screen waits for its hire
const hireBlocksClose = computed(() => store.celebratedClassLevel !== null && store.mustHireFirst)

const victory = computed(() => {
  const win = store.lastVictory
  if (!win || !win.firstTime || store.celebratedClassLevel !== win.gate) return null
  const boss = bossForGate(win.gate)
  if (!boss) return null
  // Items whose tier this gate unlocked
  const opened = (cost: number) => cost > itemCostCeiling(win.gate - 1) && cost <= itemCostCeiling(win.gate)
  const nextBoss = bossForGate(win.gate + 1)
  return {
    boss,
    killMs: win.killMs,
    splitMs: win.splitMs,
    newJobs: JOBS.filter((j) => opened(j.baseCost)).length,
    newBusinesses: BUSINESSES.filter((b) => opened(b.baseCost)).length,
    nextBoss,
    nextThreshold: nextBoss ? gateThreshold(nextBoss.gate) : 0,
    canRetireNow: win.gate >= store.minRetireGate,
    legacyNow: legacyForDepth(win.gate),
    legacyNext: legacyForDepth(win.gate + 1)
  }
})

const unlockText = computed(() => {
  const v = victory.value
  if (!v) return ''
  const parts = []
  if (v.newJobs > 0) parts.push(`${v.newJobs} new job${v.newJobs === 1 ? '' : 's'}`)
  if (v.newBusinesses > 0) parts.push(`${v.newBusinesses} new business${v.newBusinesses === 1 ? '' : 'es'}`)
  return parts.join(' and ')
})

function thresholdLabel(threshold: number): string {
  return threshold <= 0 ? '£0.00' : formatCurrency(threshold + 1)
}

function onKeyDown(ev: KeyboardEvent): void {
  if (store.classModalOpen && ev.key === 'Escape') {
    store.closeClassModal()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
})
</script>
