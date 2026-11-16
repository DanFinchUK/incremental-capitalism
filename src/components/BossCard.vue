<template>
  <section
    class="scn-BossCard"
    :class="boss ? `scn-BossCard-${boss.status}` : ''"
    data-testid="boss-card"
    aria-label="Class and the next ordeal"
  >
    <div
      class="scn-ClassRung scn-ClassCard-clickable"
      role="button"
      tabindex="0"
      data-testid="open-class-pyramid"
      :aria-label="`View British Class Pyramid (${store.highestClassReached + 1} of ${SOCIAL_CLASSES.length} unlocked)`"
      @click="store.openClassPyramid()"
      @keydown.enter.prevent="store.openClassPyramid()"
      @keydown.space.prevent="store.openClassPyramid()"
    >
      <div class="scn-ClassTopRow">
        <h1 class="scn-ClassTitle">{{ store.classStatus.current.label }}</h1>
        <span class="scn-StatHint">{{ store.highestClassReached + 1 }}/{{ SOCIAL_CLASSES.length }} · Pyramid ▸</span>
      </div>
      <span class="scn-ClassPerk">{{ store.classStatus.current.perkSummary }}</span>
    </div>

    <div class="scn-LadderDivider" aria-hidden="true"></div>

    <template v-if="boss">
      <div class="scn-BossTopRow">
        <span class="scn-ModalKicker scn-ModalKicker-accent">
          Class {{ boss.def.gate }} of 9<template v-if="store.classStatus.next">: {{ store.classStatus.next.label }}</template>
        </span>
        <span v-if="lastKill !== null || boss.bestKillMs !== null" class="scn-StatHint" data-testid="boss-kill-times">
          <span v-if="lastKill !== null">Now {{ formatClock(lastKill) }}</span>
          <span v-if="lastKill !== null && boss.bestKillMs !== null"> · </span>
          <span v-if="boss.bestKillMs !== null">Best {{ formatClock(boss.bestKillMs) }}</span>
        </span>
      </div>
      <h2 class="scn-BossTitle">{{ boss.def.title }}</h2>
      <p v-if="boss.status !== 'locked'" class="scn-StatHint" data-testid="boss-net-worth">
        Net worth {{ formatCurrency(store.netWorth) }}<template v-if="gainedThisFight !== null">
          · up {{ formatCurrency(gainedThisFight) }} this fight</template>
      </p>

      <template v-if="boss.status === 'locked'">
        <p class="scn-AutoLine" data-testid="boss-net-worth">
          Net worth {{ formatCurrency(store.netWorth) }} of {{ formatCurrency(threshold) }}
        </p>
        <div class="scn-MiniProgressTrack" role="progressbar" :aria-valuenow="pct" aria-valuemin="0" aria-valuemax="100">
          <div class="scn-MiniProgressFill" :style="{ width: `${pct}%` }"></div>
        </div>
      </template>

      <template v-else>
        <p v-if="boss.def.twistText" class="scn-BossRule"><strong>Twist:</strong> {{ store.wording(boss.def.twistText) }}</p>
        <p class="scn-BossRule"><strong>To win:</strong> {{ store.wording(store.bossConditionText(boss.def.gate)) }}</p>
        <p class="scn-BossRule"><strong>Target:</strong> {{ formatCurrency(target) }}</p>
      </template>

      <template v-if="boss.status === 'active'">
        <div class="scn-ProgressTrack" role="progressbar" :aria-valuenow="pct" aria-valuemin="0" aria-valuemax="100">
          <div class="scn-ProgressFill" :style="{ width: `${pct}%` }"></div>
        </div>
        <div class="scn-BossActions">
          <span class="scn-AutoLine">
            {{ pct }}% · {{ boss.remainingSec }}s left<template v-if="golfPar !== null && store.bossAttempt"> · {{ store.bossAttempt.purchases }}/{{ golfPar }} strokes</template>
          </span>
          <button
            v-if="store.canBackOut"
            type="button"
            class="scn-Action scn-Action-outline"
            data-testid="boss-abandon"
            @click="store.abandonBossAttempt()"
          >
            Back out ({{ store.backOutSec }}s)
          </button>
        </div>
      </template>

      <div v-else-if="boss.status === 'available'" class="scn-BossActions">
        <span class="scn-AutoLine scn-BossStakes">{{ timeLimitSec }}s limit · Defeat ends bloodline</span>
        <button type="button" class="scn-Action scn-Action-accent" data-testid="boss-start" @click="store.startBossAttempt()">
          Take it on
        </button>
      </div>
    </template>

    <template v-else>
      <h2 class="scn-BossTitle">Top of the class survey</h2>
      <p class="scn-StatHint" data-testid="boss-net-worth">Net worth {{ formatCurrency(store.netWorth) }}</p>
      <p class="scn-CardMeta" data-testid="top-of-pyramid">
        <template v-if="store.canElevate">Top of the British class pyramid reached. The Lords are expecting you.</template>
        <template v-else>Top of the British class pyramid reached. Retire to pass it all on.</template>
      </p>
      <button
        v-if="store.canElevate"
        type="button"
        class="scn-Action scn-Action-accent"
        data-testid="boss-elevate"
        @click="elevateOpen = true"
      >
        Elevate to the Lords
      </button>
    </template>
    <Teleport to="body">
      <ElevateModal :open="elevateOpen" @close="elevateOpen = false" />
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ElevateModal from './ElevateModal.vue'
import { SOCIAL_CLASSES } from '../data/classes'
import { gateThreshold } from '../engine/bosses'
import { useGameStore } from '../stores/game'
import { formatClock, formatCurrency } from '../utils/format'

const store = useGameStore()
const elevateOpen = ref(false)

const boss = computed(() => store.nextBoss)
const threshold = computed(() => (boss.value ? gateThreshold(boss.value.def.gate) : 0))
const pct = computed(() => Math.round((boss.value?.progress ?? 0) * 100))
const lastKill = computed(() => (boss.value ? (store.lastKillMs[boss.value.def.gate] ?? null) : null))
const golfPar = computed(() =>
  boss.value?.def.condition.kind === 'netWorthWithinPar' ? boss.value.def.condition.par : null
)
// What the fight has added so far, where only that counts
const gainedThisFight = computed(() => {
  const attempt = store.bossAttempt
  if (!attempt || !attempt.countsGain || boss.value?.status !== 'active' || !boss.value.def.frontierConditionText) return null
  return Math.max(0, store.netWorth - attempt.startNetWorth)
})

const target = computed(() => (boss.value ? store.bossTarget(boss.value.def.gate) : 0))
const timeLimitSec = computed(() => Math.round((boss.value?.def.timeLimitSec ?? 0) * store.modifiers.bossTimeMult))
</script>
