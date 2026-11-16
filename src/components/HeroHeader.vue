<template>
  <div class="lyt-Header">
    <template v-if="!phone">
      <!-- Hustle always shows (1.0x at rest), so Get paid never moves when pills come and go -->
      <div class="scn-HustleRow">
        <span class="scn-BuffPill scn-BuffPill-streak">
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
        <div class="scn-StatBox" data-testid="hero-money">
          <div class="scn-DataTitle">Money</div>
          <div class="scn-DataValue">{{ formatCurrency(store.money) }}</div>
          <div class="scn-StatHint">
            {{ formatCurrency(store.moneyPerSecond) }}/s<template v-if="!store.noTap"> · {{ formatCurrency(store.moneyPerClick) }}/click</template>
          </div>
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
import { INHERITED_BY_ID, TRAITS_BY_ID } from '../data/heirs'
import { peerageRank } from '../engine/peerage'

const emit = defineEmits<{
  (e: 'paid', ev: MouseEvent): void
}>()

// On a phone the dock carries Get paid and the headline numbers
defineProps<{ phone?: boolean }>()

const store = useGameStore()
const payPress = press((ev) => emit('paid', ev), 'down')
const currentTrait = computed(() => (store.heir.traitId ? TRAITS_BY_ID[store.heir.traitId] : null))
const currentInherit = computed(() => (store.heir.inheritId ? INHERITED_BY_ID[store.heir.inheritId] ?? null : null))
const payButtonRef = ref<HTMLButtonElement | null>(null)

const legacyMultLabel = computed(() => formatMultiplier(store.legacyMultiplier))

defineExpose({ payButtonRef })
</script>
