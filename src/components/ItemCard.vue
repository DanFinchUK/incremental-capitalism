<template>
  <div v-if="row.mode === 'teaser'" class="scn-Card scn-Card-teaser">
    <div class="scn-TeaserBox">?</div>
    <div class="scn-CardBody">
      <div class="scn-CardHeader">
        <h4 class="scn-CardTitle">???</h4>
      </div>
      <p class="scn-CardMeta">Cost: ???</p>
      <p class="scn-AutoLine">Buy the tier above to reveal</p>
    </div>
  </div>

  <div v-else-if="row.mode === 'gated'" class="scn-Card scn-Card-teaser" data-testid="gated-row">
    <div class="scn-TeaserBox">🔒</div>
    <div class="scn-CardBody">
      <div class="scn-CardHeader">
        <h4 class="scn-CardTitle">Locked</h4>
      </div>
      <p class="scn-AutoLine">Beat {{ row.bossTitle }} to unlock</p>
    </div>
  </div>

  <div
    v-else
    class="scn-Card"
    :data-item-key="`${kind}-${row.item.id}`"
    :class="{
      'scn-Card-automated': isAutoActive,
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
      </div>
      <span @click.stop>
        <button
          type="button"
          class="scn-Action scn-Action-compact"
          :disabled="!quote.canAfford"
          v-on="buyPress"
        >
          {{ compactBuyLabel }}
        </button>
      </span>
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
            x{{ formatMult(mMultiplier) }}
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

        <p class="scn-CardMeta scn-CostLine">
          Cost<span v-if="quote.count > 1"> (x{{ quote.count }})</span>:
          {{ formatCurrency(quote.cost) }}
          <span v-if="deltaText" class="scn-DeltaInline">{{ deltaText }}</span>
        </p>

        <p class="scn-CardMeta scn-IncomeLine">{{ incomeLineText }}</p>

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

        <p v-if="autoStatusText" class="scn-AutoLine">{{ autoStatusText }}</p>
      </div>

      <div class="scn-Actions" @click.stop>
        <button
          type="button"
          class="scn-Action"
          :disabled="!quote.canAfford"
          v-on="buyPress"
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
          Automate
        </label>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { press } from '../utils/press'
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

// Steadied in the store, so the dashed style and compact cards don't blink as
// cash moves. The buy button shows either way: you can always top up by hand.
const isAutoActive = computed(() =>
  props.row.mode === 'revealed' ? store.isAutomationShown(props.kind, props.row.item.id) : false
)

// Compact follows the Automate tick (and the global pause), never the price,
// so cards don't fold and unfold as cash moves
const compactEligible = computed(
  () =>
    props.row.mode === 'revealed' &&
    store.compactAutoBuy &&
    store.automationLine > 0 &&
    !store.autoBuyPaused &&
    store.isAutoBuyEnabled(props.kind, props.row.item.id)
)

const isCompact = computed(() => compactEligible.value && !manualExpand.value)

const canRefold = computed(() => compactEligible.value && manualExpand.value)

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
    return jobUnitClickIncome(props.row.item as JobDef, owned.value, store.jobBaseEconomyInput)
  }
  return businessUnitPerSecond(props.row.item as BusinessDef, owned.value, store.economyInput)
})

const stackTotal = computed(() => effectiveUnitIncome.value * owned.value)

const empireSharePct = computed(() => {
  if (owned.value <= 0) return 0
  const denom = props.kind === 'jobs' ? store.jobBaseMoneyPerClick : store.moneyPerSecond
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
  if (props.row.mode !== 'revealed') return ''
  const d = store.itemIncomeDelta(props.kind, props.row.item.id, quote.value.count)
  if (props.kind === 'businesses') {
    return d.deltaPerSec > 0 ? `(+${formatCurrency(d.deltaPerSec)}/s)` : ''
  }
  // The per-click gain is already on the Income line below
  return d.deltaPerSec > 0 ? `(+${formatCurrency(d.deltaPerSec)}/s)` : ''
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
  if (props.row.mode !== 'revealed' || store.automationLine <= 0) return ''
  const linePct = Math.round(store.automationLine * 100)
  if (!store.isAutoBuyEnabled(props.kind, props.row.item.id)) {
    return 'Auto off'
  }
  if (store.autoBuyPaused) {
    return 'Auto paused'
  }
  return isAutoActive.value
    ? `Auto: restocks under ${linePct}% of your cash`
    : `Auto once under ${linePct}% of your cash`
})

// Nothing automates until an advisor, heir or title brings it
const showAutoBuyCheckbox = computed(() => props.row.mode === 'revealed' && store.automationLine > 0)

// Buys on finger lift, so it works while another finger is on Get paid
const buyPress = press(() => {
  if (props.row.mode === 'revealed') emit('buy', props.kind, props.row.item.id)
})

const buyButtonLabel = computed(() => {
  const verb = props.kind === 'jobs' ? 'Get hired' : 'Get Businessed'
  return quote.value.count > 1 ? `${verb} x${quote.value.count}` : verb
})

const compactBuyLabel = computed(() => (quote.value.count > 1 ? `Buy x${quote.value.count}` : 'Buy'))

function formatMult(val: number): string {
  return val.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
}
</script>
