<template>
  <section v-if="boss" class="scn-BossCard" :class="`scn-BossCard-${boss.status}`" data-testid="boss-card" aria-label="Next class gate">
    <div class="scn-BossTop">
      <span class="scn-ModalKicker scn-ModalKicker-purple">Gate {{ boss.def.gate }} of 9</span>
      <h2 class="scn-BossTitle">{{ boss.def.title }}</h2>
    </div>
    <p class="scn-CardMeta">{{ boss.def.blurb }}</p>

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
        <span class="scn-AutoLine">{{ pct }}% · {{ boss.remainingSec }}s left</span>
        <button type="button" class="scn-Action scn-Action-outline" data-testid="boss-abandon" @click="store.abandonBossAttempt()">
          Abandon
        </button>
      </div>
    </template>

    <div v-else-if="boss.status === 'available'" class="scn-BossActions">
      <span class="scn-AutoLine">{{ boss.def.timeLimitSec }}s to win. Losing costs nothing but time.</span>
      <button type="button" class="scn-Action scn-Action-purple" data-testid="boss-start" @click="store.startBossAttempt()">
        Take it on
      </button>
    </div>

    <p v-else-if="boss.status === 'cooldown'" class="scn-AutoLine">
      Regrouping. Try again in {{ boss.cooldownSec }}s.
    </p>

    <p v-if="lastKill !== null || boss.bestKillMs !== null" class="scn-StatHint" data-testid="boss-kill-times">
      <span v-if="lastKill !== null">This generation: {{ formatClock(lastKill) }}</span>
      <span v-if="lastKill !== null && boss.bestKillMs !== null"> · </span>
      <span v-if="boss.bestKillMs !== null">Best kill: {{ formatClock(boss.bestKillMs) }}</span>
    </p>
  </section>

  <section v-else class="scn-BossCard" data-testid="boss-card" aria-label="Class gates">
    <h2 class="scn-BossTitle">Every gate beaten</h2>
    <p class="scn-CardMeta">The garden party is over and the ladder is yours. Retire to pass it all on.</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { gateThreshold } from '../engine/bosses'
import { useGameStore } from '../stores/game'
import { formatClock, formatCurrency } from '../utils/format'

const store = useGameStore()

const boss = computed(() => store.nextBoss)
const threshold = computed(() => (boss.value ? gateThreshold(boss.value.def.gate) : 0))
const pct = computed(() => Math.round((boss.value?.progress ?? 0) * 100))
const lastKill = computed(() => (boss.value ? (store.lastKillMs[boss.value.def.gate] ?? null) : null))

const target = computed(() => {
  const c = boss.value?.def.condition
  if (!c) return 0
  return c.kind === 'ownAllRevealed' ? c.netWorth : c.target
})
</script>
