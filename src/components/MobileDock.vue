<template>
  <nav ref="dockRef" class="mob-Dock" aria-label="Phone controls" data-testid="mobile-dock">
    <div class="mob-Stats">
      <span class="mob-Money" data-testid="dock-money">{{ formatCurrency(store.money) }}</span>
      <span>{{ formatCurrency(store.moneyPerSecond) }}/s</span>
      <span>{{ formatCurrency(store.moneyPerClick) }}/tap</span>
      <span v-if="store.hustleMultiplier > 1.01" class="mob-Hustle">{{ store.hustleMultiplier.toFixed(1) }}x</span>
      <span v-if="store.activeClickBuff" class="mob-Buff">{{ store.activeClickBuff.label }} x{{ store.activeClickBuff.mult }} {{ store.activeClickBuff.remainingSec }}s</span>
      <span v-if="store.activeBusinessBuff" class="mob-Buff">{{ store.activeBusinessBuff.label }} x{{ store.activeBusinessBuff.mult }} {{ store.activeBusinessBuff.remainingSec }}s</span>
      <span v-if="store.incomePenalty" class="mob-Penalty">Income x{{ store.incomePenalty.mult }} {{ store.incomePenalty.remainingSec }}s</span>
      <span v-if="store.isAutoBuyFrozen" class="mob-Penalty">Automation frozen {{ store.autoBuyFreezeRemainingSec }}s</span>
    </div>

    <div v-if="boss" class="mob-Gate" :class="`mob-Gate-${boss.status}`" data-testid="dock-gate">
      <div class="mob-GateText">
        <strong>{{ boss.def.title }}</strong>
        <span class="mob-GateSep" aria-hidden="true">·</span>
        <span v-if="boss.status === 'locked'">Gate {{ boss.def.gate }} · {{ formatCurrency(Math.max(0, threshold - store.netWorth)) }} to go</span>
        <span v-else-if="boss.status === 'active'">{{ pct }}% · {{ boss.remainingSec }}s left</span>
        <span v-else-if="boss.status === 'cooldown'">Regrouping, {{ boss.cooldownSec }}s</span>
        <span v-else>Gate {{ boss.def.gate }} · ready when you are</span>
      </div>
      <div v-if="boss.status !== 'locked'" class="mob-GateActions">
        <button type="button" class="scn-Action scn-Action-outline" data-testid="dock-boss-rules" @click="emit('rules')">
          Rules
        </button>
        <button
          v-if="boss.status === 'available'"
          type="button"
          class="scn-Action scn-Action-purple"
          data-testid="dock-boss-start"
          @click="startBoss"
        >
          Take it on
        </button>
      </div>
      <div class="mob-GateBar" role="progressbar" :aria-valuenow="pct" aria-valuemin="0" aria-valuemax="100">
        <div class="mob-GateFill" :style="{ width: `${pct}%` }"></div>
      </div>
    </div>

    <!-- Opportunities and scandals are teleported here on a phone -->
    <div id="dock-events" class="mob-EventSlot"></div>

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
        <span v-if="hasNew(t.id)" class="mob-TabNew" data-testid="tab-new">New</span>
        <span v-if="affordable(t.id) > 0" class="mob-TabCount" data-testid="tab-affordable" :aria-label="`${affordable(t.id)} you can afford`">{{ affordable(t.id) }}</span>
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import type { ItemKind } from '../data/items'
import { gateThreshold } from '../engine/bosses'
import { useGameStore } from '../stores/game'
import { formatCurrency } from '../utils/format'

export type PhoneTab = 'jobs' | 'businesses' | 'family'

const props = defineProps<{ tab: PhoneTab }>()
const emit = defineEmits<{
  (e: 'paid', ev: MouseEvent): void
  (e: 'tab', tab: PhoneTab): void
  (e: 'rules'): void
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

// Tab badges: how many items in each list you can afford right now, and
// whether it has items revealed since you last looked. Information only;
// working out which to buy is still yours.
const LIST_KIND: Partial<Record<PhoneTab, ItemKind>> = { jobs: 'jobs', businesses: 'businesses' }

function revealedIds(kind: ItemKind): string[] {
  const rows = kind === 'jobs' ? store.visibleJobs : store.visibleBusinesses
  return rows.flatMap((r) => (r.mode === 'revealed' ? [r.item.id] : []))
}

function affordable(tab: PhoneTab): number {
  const kind = LIST_KIND[tab]
  return kind ? revealedIds(kind).filter((id) => store.itemQuote(kind, id).canAfford).length : 0
}

const viewed = reactive<Record<ItemKind, Set<string>>>({
  jobs: new Set(revealedIds('jobs')),
  businesses: new Set(revealedIds('businesses'))
})

function hasNew(tab: PhoneTab): boolean {
  const kind = LIST_KIND[tab]
  return kind !== undefined && tab !== props.tab && revealedIds(kind).some((id) => !viewed[kind].has(id))
}

// Whatever is revealed on the open tab counts as seen
watch(
  () => [props.tab, revealedIds('jobs').length, revealedIds('businesses').length],
  () => {
    const kind = LIST_KIND[props.tab]
    if (kind) for (const id of revealedIds(kind)) viewed[kind].add(id)
  },
  { immediate: true }
)

function startBoss(): void {
  store.startBossAttempt()
}
</script>
