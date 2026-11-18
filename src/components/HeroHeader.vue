<template>
  <div class="lyt-Header">
    <template v-if="!phone">
      <!-- Hustle always shows (1.0x at rest), so Get paid never moves when pills come and go -->
      <div class="scn-HustleRow">
        <span class="scn-BuffPill scn-BuffPill-streak">
          Hustle x{{ store.hustleMultiplier.toFixed(1) }}
        </span>
        <span v-if="store.activeBusinessBuff" class="scn-BuffPill">
          {{ store.activeBusinessBuff.label }} x{{ store.activeBusinessBuff.mult }} ({{ store.activeBusinessBuff.remainingSec }}s)
        </span>
        <span v-if="store.activeClickBuff" class="scn-BuffPill">
          {{ store.activeClickBuff.label }} x{{ store.activeClickBuff.mult }} ({{ store.activeClickBuff.remainingSec }}s)
        </span>
        <span v-if="store.incomePenalty" class="scn-BuffPill scn-BuffPill-freeze" data-testid="penalty-pill">
          Scandal x{{ store.incomePenalty.mult }} ({{ store.incomePenalty.remainingSec }}s)
        </span>
        <span v-if="store.isAutoBuyFrozen" class="scn-BuffPill scn-BuffPill-freeze">
          Auto paused ({{ store.autoBuyFreezeRemainingSec }}s)
        </span>
        <span v-for="(f, i) in store.activeFavours" :key="`favour-${i}`" class="scn-BuffPill scn-BuffPill-favour" data-testid="favour-running">
          {{ f.title }} · {{ formatClock(f.leftMs) }}
        </span>
        <button
          v-if="store.favoursLeft > 0"
          type="button"
          class="scn-BuffPill scn-FavourCall"
          data-testid="call-in-favour"
          @click="store.callInFavour()"
        >
          {{ store.favourButtonLabel }}
        </button>
      </div>

      <button
        v-if="!store.noTap"
        ref="payButtonRef"
        type="button"
        class="scn-PrimaryAction"
        v-on="payPress"
      >
        Get paid
      </button>
      <div v-else class="scn-AllowancePanel" data-testid="allowance-panel">
        <span>{{ store.allowanceLabel }}</span>
        <strong>{{ formatCurrency(store.allowancePerSecond) }}/s</strong>
      </div>
    </template>

    <div class="scn-DynastyStrip">
      <p class="scn-HeirLine" data-testid="current-heir">
        <strong>{{ store.heir.name }}</strong>
        <span> · {{ currentTrait ? currentTrait.name : 'Founder' }}</span>
        <span v-if="currentInherit" class="scn-StatHint"> · passes down {{ currentInherit.name }}</span>
        <span v-if="store.titles > 0"> · {{ peerageRank(store.titles) }} ({{ store.titles }})</span>
        <span class="scn-StatHint"> · Gen {{ store.generation }}</span>
        <button type="button" class="scn-LinkButton" data-testid="open-family-tree" @click="store.familyTreeOpen = true">
          Family tree
        </button>
        <button
          v-if="store.canAbdicate"
          type="button"
          class="scn-LinkButton"
          data-testid="open-abdication"
          title="Hand over to a younger sibling now, traits and all. Once a generation."
          @click="store.offerAbdication()"
        >
          Abdicate
        </button>
      </p>

      <!-- The family's lasting effects; the temporary ones sit with Hustle -->
      <div
        v-if="store.bloodlineTraitPills.length > 0 || store.allowancePill || store.dominanceHeld > 0 || awardsShown"
        class="scn-TraitPillRow"
        data-testid="header-bloodline-pills"
      >
        <button
          v-if="awardsShown"
          type="button"
          class="scn-TraitPill scn-TraitPill-button"
          :aria-expanded="awardsOpen"
          data-testid="awards-pill"
          @click="awardsOpen = !awardsOpen"
        >
          {{ store.awards.length > 0 ? `King's Awards x${formatMultiplier(awardMultiplier(store.awards.length))}` : "King's Awards: none yet" }}
        </button>
        <span v-if="store.dominanceHeld > 0" class="scn-TraitPill" data-testid="dominance-pill">
          Market dominance +{{ Math.round((dominanceMultiplier(store.dominanceHeld) - 1) * 100) }}%
        </span>
        <span
          v-if="store.allowancePill"
          class="scn-TraitPill"
          :class="{ 'scn-TraitPill-neg': store.allowancePill.negative }"
          data-testid="allowance-pill"
        >
          {{ store.allowancePill.label }}
        </span>
        <span
          v-for="pill in store.bloodlineTraitPills"
          :key="pill.label"
          class="scn-TraitPill"
          :class="{ 'scn-TraitPill-neg': pill.negative }"
        >
          {{ store.wording(pill.label) }}
        </span>
      </div>
      <div v-if="awardsShown && awardsOpen" class="scn-AwardsPanel" data-testid="awards-panel">
        <p class="scn-AwardsRule">
          When every Job in a group of five reaches 25 owned, the family wins a King's Award, and again at 100, 250, 500 and
          1,000. Businesses are grouped the same way. Each award multiplies all income by 1.25.
        </p>
        <ul v-if="awardRows.length > 0">
          <li v-for="row in awardRows" :key="`${row.kind}-${row.from}`">
            <strong>{{ row.title }}</strong>
            <span>{{ row.line }}</span>
          </li>
        </ul>
        <p v-else class="scn-AwardsRule">Nothing bought yet.</p>
      </div>

      <div v-if="!phone" class="scn-CompactStats">
        <div class="scn-StatBox" data-testid="hero-money">
          <div class="scn-DataTitle">Money</div>
          <div class="scn-DataValue">{{ formatCurrency(store.money) }}</div>
          <div class="scn-StatHint">
            {{ formatCurrency(store.moneyPerSecond) }}/s<template v-if="!store.noTap"> · {{ formatCurrency(store.moneyPerClick) }}/click</template>
          </div>
        </div>
        <!-- Retiring lives here on desktop: the box is the button once it is allowed -->
        <button
          v-if="store.canRetire"
          type="button"
          class="scn-StatBox scn-RetireBox"
          :class="{ 'scn-RetireBox-pays': store.legacyOnRetire > 0 }"
          data-testid="hero-retire"
          @click="emit('retire')"
        >
          <div class="scn-DataTitle">Retire for +{{ store.legacyOnRetire }} Legacy</div>
          <div class="scn-StatHint">Income multiplier</div>
          <div v-if="store.legacyOnRetire > 0" class="scn-DataValue" data-testid="hero-retire-mult">
            x{{ legacyMultLabel }} → x{{ retireMultLabel }}
          </div>
          <div v-else class="scn-DataValue">x{{ legacyMultLabel }}</div>
        </button>
        <div v-else class="scn-StatBox" data-testid="hero-legacy">
          <div class="scn-DataTitle">{{ retireBlockedTitle }}</div>
          <div class="scn-StatHint">Income multiplier</div>
          <div class="scn-DataValue">x{{ legacyMultLabel }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { press } from '../utils/press'
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/game'
import { formatClock, formatCurrency, formatMultiplier } from '../utils/format'
import { INHERITED_BY_ID, TRAITS_BY_ID } from '../data/heirs'
import { peerageRank } from '../engine/peerage'
import { dominanceMultiplier, legacyMultiplier as calcLegacyMultiplier } from '../engine/economy'
import { AWARD_LEVELS, awardMultiplier, awardProgress } from '../engine/awards'
import { BUSINESSES, JOBS } from '../data/items'

const emit = defineEmits<{
  (e: 'paid', ev: MouseEvent): void
  (e: 'retire'): void
}>()

// On a phone the dock carries Get paid and the headline numbers
defineProps<{ phone?: boolean }>()

const store = useGameStore()
const payPress = press((ev) => emit('paid', ev), 'down')
const currentTrait = computed(() => (store.heir.traitId ? TRAITS_BY_ID[store.heir.traitId] : null))
const currentInherit = computed(() => (store.heir.inheritId ? INHERITED_BY_ID[store.heir.inheritId] ?? null : null))
const payButtonRef = ref<HTMLButtonElement | null>(null)

const legacyMultLabel = computed(() => formatMultiplier(store.legacyMultiplier))
const retireMultLabel = computed(() =>
  formatMultiplier(calcLegacyMultiplier(store.legacyPoints + store.legacyOnRetire, store.modifiers.legacyScale))
)
// Before the gate that opens retiring, or while an heir draft or disgrace is pending
const retireBlockedTitle = computed(() =>
  store.gatesBeaten < store.minRetireGate ? `Retire at class ${store.minRetireGate}` : 'Legacy'
)

defineExpose({ payButtonRef })

// King's Awards (the trial ladder): the pill opens how each group stands
const awardsShown = computed(() => store.familyTuning === 'trial')
const awardsOpen = ref(false)
const awardRows = computed(() =>
  awardProgress(store.jobsPurchased, store.businessesOwned).map((block) => {
    const list = block.kind === 'jobs' ? JOBS : BUSINESSES
    const title = `${block.kind === 'jobs' ? 'Jobs' : 'Businesses'}: ${list[block.from].label} to ${list[block.to].label}`
    const won = `${block.held} of ${AWARD_LEVELS.length} won`
    const line =
      block.next === null || !block.laggard
        ? `All ${AWARD_LEVELS.length} won.`
        : `${won}. Next at ${block.next.toLocaleString('en-GB')}: ${block.laggard.label} has ${block.laggard.owned.toLocaleString('en-GB')}.`
    return { kind: block.kind, from: block.from, title, line }
  })
)
</script>
