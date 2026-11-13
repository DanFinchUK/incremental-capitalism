<template>
  <section
    class="scn-BossCard"
    :class="boss ? `scn-BossCard-${boss.status}` : ''"
    data-testid="boss-card"
    aria-label="Class and next gate"
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
        <span class="scn-ModalKicker scn-ModalKicker-purple">
          Gate {{ boss.def.gate }} / 9<template v-if="store.classStatus.next"> → {{ store.classStatus.next.label }}</template>
        </span>
        <span v-if="lastKill !== null || boss.bestKillMs !== null" class="scn-StatHint" data-testid="boss-kill-times">
          <span v-if="lastKill !== null">Now {{ formatClock(lastKill) }}</span>
          <span v-if="lastKill !== null && boss.bestKillMs !== null"> · </span>
          <span v-if="boss.bestKillMs !== null">Best {{ formatClock(boss.bestKillMs) }}</span>
        </span>
      </div>
      <h2 class="scn-BossTitle">{{ boss.def.title }}</h2>

      <template v-if="boss.status === 'locked'">
        <p class="scn-AutoLine">
          Unlocks at {{ formatCurrency(threshold) }} net worth ({{ formatCurrency(Math.max(0, threshold - store.netWorth)) }} to go).
        </p>
        <div class="scn-MiniProgressTrack" role="progressbar" :aria-valuenow="pct" aria-valuemin="0" aria-valuemax="100">
          <div class="scn-MiniProgressFill" :style="{ width: `${pct}%` }"></div>
        </div>
      </template>

      <template v-else>
        <p class="scn-BossRule"><strong>Twist:</strong> {{ boss.def.twistText }}</p>
        <p class="scn-BossRule"><strong>To win:</strong> {{ boss.def.conditionText }} Target {{ formatCurrency(target) }}.</p>
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
        <span v-if="store.mustHireFirst" class="scn-AutoLine" data-testid="boss-hire-first">Settle headhunter first.</span>
        <button v-else type="button" class="scn-Action scn-Action-purple" data-testid="boss-start" @click="store.startBossAttempt()">
          Take it on
        </button>
      </div>
    </template>

    <template v-else>
      <h2 class="scn-BossTitle">Every gate beaten</h2>
      <p class="scn-CardMeta">Top of the British class pyramid reached. Retire to pass it all on.</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { SOCIAL_CLASSES } from '../data/classes'
import { gateThreshold } from '../engine/bosses'
import { useGameStore } from '../stores/game'
import { formatClock, formatCurrency } from '../utils/format'

const store = useGameStore()

const boss = computed(() => store.nextBoss)
const threshold = computed(() => (boss.value ? gateThreshold(boss.value.def.gate) : 0))
const pct = computed(() => Math.round((boss.value?.progress ?? 0) * 100))
const lastKill = computed(() => (boss.value ? (store.lastKillMs[boss.value.def.gate] ?? null) : null))
const golfPar = computed(() =>
  boss.value?.def.condition.kind === 'netWorthWithinPar' ? boss.value.def.condition.par : null
)

const target = computed(() => (boss.value ? store.bossTarget(boss.value.def.gate) : 0))
const timeLimitSec = computed(() => Math.round((boss.value?.def.timeLimitSec ?? 0) * store.modifiers.bossTimeMult))
</script>
