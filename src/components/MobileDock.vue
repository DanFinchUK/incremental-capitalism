<template>
  <nav ref="dockRef" class="mob-Dock" aria-label="Phone controls" data-testid="mobile-dock">
    <div class="mob-Stats">
      <span class="mob-Money" data-testid="dock-money">{{ formatCurrency(store.money) }}</span>
      <span>{{ formatCurrency(store.moneyPerSecond) }}/s</span>
      <span>{{ formatCurrency(store.moneyPerClick) }}/tap</span>
      <span v-if="store.hustleMultiplier > 1.01" class="mob-Hustle">{{ store.hustleMultiplier.toFixed(1) }}x</span>
    </div>

    <div v-if="boss" class="mob-Gate" :class="`mob-Gate-${boss.status}`" data-testid="dock-gate">
      <div class="mob-GateText">
        <strong>Gate {{ boss.def.gate }}: {{ boss.def.title }}</strong>
        <span class="mob-GateSep" aria-hidden="true">·</span>
        <span v-if="boss.status === 'locked'">{{ formatCurrency(Math.max(0, threshold - store.netWorth)) }} to go</span>
        <span v-else-if="boss.status === 'active'">{{ pct }}% · {{ boss.remainingSec }}s left</span>
        <span v-else-if="boss.status === 'cooldown'">Regrouping, {{ boss.cooldownSec }}s</span>
        <span v-else>Ready when you are</span>
      </div>
      <button
        v-if="boss.status === 'available'"
        type="button"
        class="scn-Action scn-Action-purple"
        data-testid="dock-boss-start"
        @click="startBoss"
      >
        Take it on
      </button>
      <button
        v-else-if="boss.status === 'active' || boss.status === 'cooldown'"
        type="button"
        class="scn-Action scn-Action-outline"
        @click="emit('tab', 'family')"
      >
        Rules
      </button>
      <div class="mob-GateBar" role="progressbar" :aria-valuenow="pct" aria-valuemin="0" aria-valuemax="100">
        <div class="mob-GateFill" :style="{ width: `${pct}%` }"></div>
      </div>
    </div>

    <button ref="payButtonRef" type="button" class="scn-PrimaryAction mob-Pay" @click="emit('paid', $event)">
      Get paid
    </button>

    <div class="mob-Tabs" role="tablist">
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        role="tab"
        class="mob-Tab"
        :class="{ 'mob-Tab-active': tab === t.id }"
        :aria-selected="tab === t.id"
        :data-testid="`tab-${t.id}`"
        @click="emit('tab', t.id)"
      >
        {{ t.label }}
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { gateThreshold } from '../engine/bosses'
import { useGameStore } from '../stores/game'
import { formatCurrency } from '../utils/format'

export type PhoneTab = 'jobs' | 'businesses' | 'family'

defineProps<{ tab: PhoneTab }>()
const emit = defineEmits<{
  (e: 'paid', ev: MouseEvent): void
  (e: 'tab', tab: PhoneTab): void
}>()

const store = useGameStore()
const payButtonRef = ref<HTMLButtonElement | null>(null)
defineExpose({ payButtonRef })

// The page keeps clear of the dock, whatever height it grows to
const dockRef = ref<HTMLElement | null>(null)
let observer: ResizeObserver | null = null
onMounted(() => {
  if (!dockRef.value || typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver(([entry]) => {
    document.documentElement.style.setProperty('--dock-h', `${Math.ceil(entry.target.getBoundingClientRect().height)}px`)
  })
  observer.observe(dockRef.value)
})
onUnmounted(() => {
  observer?.disconnect()
  document.documentElement.style.removeProperty('--dock-h')
})

const tabs: ReadonlyArray<{ id: PhoneTab; label: string }> = [
  { id: 'jobs', label: 'Jobs' },
  { id: 'businesses', label: 'Businesses' },
  { id: 'family', label: 'Family & gates' }
]

const boss = computed(() => store.nextBoss)
const threshold = computed(() => (boss.value ? gateThreshold(boss.value.def.gate) : 0))
const pct = computed(() => Math.round((boss.value?.progress ?? 0) * 100))

function startBoss(): void {
  store.startBossAttempt()
}
</script>
