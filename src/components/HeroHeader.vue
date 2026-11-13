<template>
  <div class="lyt-Header">
    <template v-if="!phone">
      <div v-if="hasActivePills" class="scn-HustleRow">
        <span v-if="store.hustleMultiplier > 1.01" class="scn-BuffPill scn-BuffPill-streak">
          {{ store.hustleMultiplier.toFixed(1) }}x Hustle
        </span>
        <span v-if="store.activeBusinessBuff" class="scn-BuffPill">
          {{ store.activeBusinessBuff.mult }}x {{ store.activeBusinessBuff.label }} ({{ store.activeBusinessBuff.remainingSec }}s)
        </span>
        <span v-if="store.activeClickBuff" class="scn-BuffPill">
          {{ store.activeClickBuff.mult }}x {{ store.activeClickBuff.label }} ({{ store.activeClickBuff.remainingSec }}s)
        </span>
        <span v-if="store.incomePenalty" class="scn-BuffPill scn-BuffPill-freeze" data-testid="penalty-pill">
          Scandal x{{ store.incomePenalty.mult }} ({{ store.incomePenalty.remainingSec }}s)
        </span>
        <span v-if="store.isAutoBuyFrozen" class="scn-BuffPill scn-BuffPill-freeze">
          Auto paused ({{ store.autoBuyFreezeRemainingSec }}s)
        </span>
      </div>

      <button
        ref="payButtonRef"
        type="button"
        class="scn-PrimaryAction"
        v-on="payPress"
      >
        Get paid
      </button>
    </template>

    <div class="scn-DynastyStrip">
      <p class="scn-HeirLine" data-testid="current-heir">
        <strong>{{ store.heir.name }}</strong>
        <span> · {{ currentTrait ? currentTrait.name : 'Founder' }}</span>
        <span v-if="store.titles > 0"> · {{ peerageRank(store.titles) }} ({{ store.titles }})</span>
        <span class="scn-StatHint"> · Gen {{ store.generation }}</span>
        <button type="button" class="scn-LinkButton" data-testid="open-family-tree" @click="store.familyTreeOpen = true">
          Family tree
        </button>
      </p>

      <div v-if="store.bloodlineTraitPills.length > 0" class="scn-TraitPillRow" data-testid="header-bloodline-pills">
        <span
          v-for="pill in store.bloodlineTraitPills"
          :key="pill.label"
          class="scn-TraitPill"
          :class="{ 'scn-TraitPill-neg': pill.negative }"
        >
          {{ pill.label }}
        </span>
      </div>

      <div v-if="!phone" class="scn-CompactStats">
        <div class="scn-StatBox">
          <div class="scn-DataTitle">Net worth</div>
          <div class="scn-DataValue">{{ formatCurrency(store.netWorth) }}</div>
        </div>
        <div class="scn-StatBox">
          <div class="scn-DataTitle">Legacy &amp; Interns</div>
          <div class="scn-DataValue">
            {{ store.legacyPoints }} (x{{ legacyMultLabel }}) · {{ store.modifiers.internsDisabled ? 'Interns barred' : `${store.autoClickers} intern${store.autoClickers === 1 ? '' : 's'}` }}
          </div>
          <div class="scn-StatHint">
            Retiring now pays +{{ store.legacyOnRetire }} Legacy
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { press } from '../utils/press'
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/game'
import { formatCurrency, formatMultiplier } from '../utils/format'
import { TRAITS_BY_ID } from '../data/heirs'
import { peerageRank } from '../engine/peerage'

const emit = defineEmits<{
  (e: 'paid', ev: MouseEvent): void
}>()

// On a phone the dock carries Get paid and the headline numbers
defineProps<{ phone?: boolean }>()

const store = useGameStore()
const payPress = press((ev) => emit('paid', ev), 'down')
const currentTrait = computed(() => (store.heir.traitId ? TRAITS_BY_ID[store.heir.traitId] : null))
const payButtonRef = ref<HTMLButtonElement | null>(null)

const legacyMultLabel = computed(() => formatMultiplier(store.legacyMultiplier))
const hasActivePills = computed(
  () =>
    store.hustleMultiplier > 1.01 ||
    Boolean(store.activeBusinessBuff) ||
    Boolean(store.activeClickBuff) ||
    Boolean(store.incomePenalty) ||
    store.isAutoBuyFrozen
)

defineExpose({ payButtonRef })
</script>
