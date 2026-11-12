<template>
  <div v-if="row.mode === 'teaser'" class="scn-Card scn-Card-teaser">
    <div class="scn-TeaserBox">?</div>
    <div class="scn-CardBody">
      <div class="scn-CardHeader">
        <h4 class="scn-CardTitle">???</h4>
      </div>
      <p class="scn-CardMeta">Cost: ???</p>
      <p class="scn-AutoLine">Expand your portfolio to reveal this tier</p>
    </div>
  </div>

  <div
    v-else
    class="scn-Card"
    :data-item-key="`${kind}-${row.item.id}`"
    :class="{
      'scn-NextAutoBuy': store.isNextAutoBuy(kind, row.item.id),
      'scn-Card-compact': isCompact
    }"
    @click="handleCardClick"
  >
    <template v-if="isCompact">
      <img
        class="scn-CardImage scn-CardImage-compact"
        :src="itemImageUrl(kind, row.item.label)"
        :alt="row.item.label"
      >
      <div class="scn-CompactBody">
        <span class="scn-CompactTitle">{{ row.item.label }} ({{ owned }})</span>
        <span v-if="mMultiplier > 1" class="scn-MilestoneBadge">
          x{{ formatMult(mMultiplier) }}
        </span>
        <span class="scn-CompactIncome">{{ compactIncomeText }}</span>
        <span v-if="store.isNextAutoBuy(kind, row.item.id)" class="scn-NextTag">Next</span>
      </div>
      <label
        v-if="showAutoBuyCheckbox"
        class="scn-AutoBuy"
        @click.stop
      >
        <input
          type="checkbox"
          :checked="store.isAutoBuyEnabled(kind, row.item.id)"
          @change="store.toggleAutoBuy(kind, row.item.id)"
        >
        Auto
      </label>
    </template>

    <template v-else>
      <img
        class="scn-CardImage"
        :src="itemImageUrl(kind, row.item.label)"
        :alt="row.item.label"
      >

      <div class="scn-CardBody">
        <div class="scn-CardHeader">
          <h4 class="scn-CardTitle">{{ row.item.label }} ({{ owned }})</h4>
          <span v-if="mMultiplier > 1" class="scn-MilestoneBadge">
            x{{ formatMult(mMultiplier) }} milestone
          </span>
          <button
            v-if="canRefold"
            type="button"
            class="scn-CompactRefold"
            @click.stop="manualExpand = false"
          >
            Collapse
          </button>
        </div>

        <p class="scn-CardMeta">
          {{ kind === 'jobs' ? 'Cost to apply' : 'Cost to start' }}<span v-if="quote.count > 1"> (x{{ quote.count }})</span>:
          {{ formatCurrency(quote.cost) }}
          <span v-if="deltaText" class="scn-DeltaInline">{{ deltaText }}</span>
        </p>

        <p class="scn-CardMeta">{{ incomeLineText }}</p>

        <p class="scn-SynergyLine">{{ synergyText }}</p>

        <div class="scn-Pips" aria-label="Ownership milestones">
          <span
            v-for="m in milestones"
            :key="m"
            class="scn-Pip"
            :class="{ 'scn-Pip-on': owned >= m }"
          >
            {{ m }}
          </span>
        </div>

        <p class="scn-AutoLine">{{ autoStatusText }}</p>
      </div>

      <div class="scn-Actions" @click.stop>
        <button
          v-if="!store.isAutoBuyActive(kind, row.item.id)"
          type="button"
          class="scn-Action"
          :disabled="!quote.canAfford"
          @click="emit('buy', kind, row.item.id)"
        >
          {{ buyButtonLabel }}
        </button>

        <label
          v-if="showAutoBuyCheckbox"
          class="scn-AutoBuy"
        >
          <input
            type="checkbox"
            :checked="store.isAutoBuyEnabled(kind, row.item.id)"
            @change="store.toggleAutoBuy(kind, row.item.id)"
          >
          Auto-buy
        </label>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  BUSINESSES_BY_ID,
  SYNERGY_JOB_FOR_BUSINESS,
  itemImageUrl,
  type BusinessDef,
  type ItemKind,
  type JobDef
} from '../data/items'
import {
  businessUnitPerSecond,
  itemMilestones,
  jobUnitClickIncome,
  milestoneMultiplier
} from '../engine/economy'
import { useGameStore, type VisibleRow } from '../stores/game'
import { formatCurrency } from '../utils/format'

const props = defineProps<{
  kind: ItemKind
  row: VisibleRow<JobDef | BusinessDef>
}>()

const emit = defineEmits<{
  (e: 'buy', kind: ItemKind, id: string): void
}>()

const store = useGameStore()
const manualExpand = ref(false)

watch(
  () => store.compactAutoBuy,
  () => {
    manualExpand.value = false
  }
)

const isAutoActive = computed(() =>
  props.row.mode === 'revealed' ? store.isAutoBuyActive(props.kind, props.row.item.id) : false
)

const isCompact = computed(
  () => props.row.mode === 'revealed' && store.compactAutoBuy && isAutoActive.value && !manualExpand.value
)

const canRefold = computed(
  () => props.row.mode === 'revealed' && store.compactAutoBuy && isAutoActive.value && manualExpand.value
)

function handleCardClick(): void {
  if (isCompact.value) {
    manualExpand.value = true
  }
}

const owned = computed(() => {
  if (props.row.mode !== 'revealed') return 0
  return props.kind === 'jobs'
    ? (store.jobsPurchased[props.row.item.id] ?? 0)
    : (store.businessesOwned[props.row.item.id] ?? 0)
})

const milestones = computed(() =>
  props.row.mode === 'revealed' ? itemMilestones(props.row.item.scaleFactor) : []
)

const quote = computed(() => {
  if (props.row.mode !== 'revealed') {
    return { count: 1, cost: 0, canAfford: false }
  }
  return store.itemQuote(props.kind, props.row.item.id)
})

const mMultiplier = computed(() =>
  props.row.mode === 'revealed'
    ? milestoneMultiplier(owned.value, props.row.item.scaleFactor, store.perks.deregulation)
    : 1
)

const effectiveUnitIncome = computed(() => {
  if (props.row.mode !== 'revealed') return 0
  if (props.kind === 'jobs') {
    return jobUnitClickIncome(props.row.item as JobDef, owned.value, store.economyInput) * store.hustleMultiplier
  }
  return businessUnitPerSecond(props.row.item as BusinessDef, owned.value, store.economyInput)
})

const stackTotal = computed(() => effectiveUnitIncome.value * owned.value)

const empireSharePct = computed(() => {
  if (owned.value <= 0) return 0
  const denom = props.kind === 'jobs' ? store.moneyPerClick : store.moneyPerSecond
  if (denom <= 0) return 0
  return Math.min(100, (stackTotal.value / denom) * 100)
})

const unitSuffix = computed(() => (props.kind === 'jobs' ? 'click' : 's'))

const incomeLineText = computed(() => {
  if (props.row.mode !== 'revealed') return ''
  if (owned.value > 0) {
    return `Income: ${formatCurrency(effectiveUnitIncome.value)}/${unitSuffix.value} each · ${formatCurrency(stackTotal.value)}/${unitSuffix.value} total (${empireSharePct.value.toFixed(1)}%)`
  }
  return `Income: ${formatCurrency(effectiveUnitIncome.value)} / ${props.kind === 'jobs' ? 'click' : 'second'} each`
})

const compactIncomeText = computed(() => {
  if (owned.value <= 0) return ''
  return `${formatCurrency(stackTotal.value)}/${unitSuffix.value} (${empireSharePct.value.toFixed(1)}%)`
})

const deltaText = computed(() => {
  if (props.row.mode !== 'revealed' || isAutoActive.value) return ''
  const d = store.itemIncomeDelta(props.kind, props.row.item.id, quote.value.count)
  if (props.kind === 'businesses') {
    return d.deltaPerSec > 0 ? `(+${formatCurrency(d.deltaPerSec)}/s)` : ''
  }
  if (d.deltaPerSec > 0) {
    return `(+${formatCurrency(d.deltaPerClick)}/click, +${formatCurrency(d.deltaPerSec)}/s)`
  }
  return d.deltaPerClick > 0 ? `(+${formatCurrency(d.deltaPerClick)}/click)` : ''
})

const synergyText = computed(() => {
  if (props.row.mode !== 'revealed') return ''
  if (props.kind === 'jobs') {
    const job = props.row.item as JobDef
    const biz = BUSINESSES_BY_ID[job.synergyBusinessId]
    const bizCount = store.businessesOwned[job.synergyBusinessId] ?? 0
    return bizCount > 0
      ? `${job.synergyNote} (+${owned.value}% to ${biz.label})`
      : `${job.synergyNote} (+${owned.value}% once ${biz.label} owned)`
  }
  const synJob = SYNERGY_JOB_FOR_BUSINESS[props.row.item.id]
  if (!synJob) return ''
  const synCount = store.jobsPurchased[synJob.id] ?? 0
  return synCount > 0
    ? `Boosted +${synCount}% by ${synJob.label} (${synCount} hired)`
    : `Synergy: +1% output per ${synJob.label} hired`
})

const autoStatusText = computed(() => {
  if (props.row.mode !== 'revealed') return ''
  const id = props.row.item.id
  const lifetime = store.lifetimePurchases[props.kind][id] ?? 0
  const threshold = store.itemAutoBuyThreshold(props.kind, id)

  if (lifetime < threshold) {
    if (props.kind === 'businesses' && store.legacyPoints < 1) {
      return `Auto-buy needs 1 Legacy + ${threshold} lifetime buys (${lifetime}/${threshold})`
    }
    return `Auto-buy unlocks after ${threshold} lifetime buys (${lifetime}/${threshold})`
  }
  if (props.kind === 'businesses' && store.legacyPoints < 1) {
    return `Purchase goal met (${lifetime}/${threshold}). Retire once to activate Business auto-buy`
  }
  if (props.kind === 'jobs' && store.autoClickers < 1) {
    return 'Purchase goal met: hire Unpaid Interns in Old Boys\' Network to auto-buy Jobs'
  }
  if (store.autoBuyPaused) {
    return 'Auto-buy paused globally (resume in top bar)'
  }
  return store.isNextAutoBuy(props.kind, id) ? 'Auto-buy active · Next purchase target' : 'Auto-buy unlocked'
})

const showAutoBuyCheckbox = computed(() => {
  if (props.row.mode !== 'revealed') return false
  if (props.kind === 'jobs' && store.autoClickers < 1) return false
  return store.isAutoBuyUnlocked(props.kind, props.row.item.id)
})

const buyButtonLabel = computed(() => {
  const verb = props.kind === 'jobs' ? 'Get hired' : 'Get Businessed'
  return quote.value.count > 1 ? `${verb} x${quote.value.count}` : verb
})

function formatMult(val: number): string {
  return val.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
}
</script>
