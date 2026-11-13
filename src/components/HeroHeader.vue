<template>
  <div class="lyt-Header">
    <div class="lyt-Columns">
      <div class="lyt-Column">
        <div class="lyt-Items">
          <div
            class="scn-ClassCard scn-ClassCard-clickable"
            role="button"
            tabindex="0"
            data-testid="open-class-pyramid"
            :aria-label="`View British Class Pyramid (${store.highestClassReached + 1} of ${SOCIAL_CLASSES.length} unlocked)`"
            @click="store.openClassPyramid()"
            @keydown.enter.prevent="store.openClassPyramid()"
            @keydown.space.prevent="store.openClassPyramid()"
          >
            <h1 class="scn-ClassTitle">
              Your current social class: {{ store.classStatus.current.label }}
            </h1>
            <p class="scn-ClassDesc">{{ store.classStatus.current.description }}</p>
            <span class="scn-ClassPerk">Privilege: {{ store.classStatus.current.perkSummary }}</span>

            <div class="scn-ProgressTrack" role="progressbar" :aria-valuenow="Math.round(store.classStatus.bracketProgress * 100)" aria-valuemin="0" aria-valuemax="100">
              <div
                class="scn-ProgressFill"
                :style="{ width: `${(store.classStatus.bracketProgress * 100).toFixed(1)}%` }"
              ></div>
            </div>

            <p v-if="store.classStatus.next && store.nextBoss">
              Next social class ({{ store.classStatus.next.label }}):
              <template v-if="store.netWorth < store.classStatus.next.threshold">
                {{ formatCurrency(store.classStatus.next.threshold - store.netWorth) }} to unlock {{ store.nextBoss.def.title }}
              </template>
              <template v-else>beat {{ store.nextBoss.def.title }} to join</template>
            </p>
            <p v-else>Top of the British class pyramid reached.</p>
            <span class="scn-StatHint">
              {{ store.highestClassReached + 1 }}/{{ SOCIAL_CLASSES.length }} classes unlocked · Click to view pyramid
            </span>
          </div>
          <p class="scn-HeirLine" data-testid="current-heir">
            Head of the family: <strong>{{ store.heir.name }}</strong>
            <span v-if="currentTrait"> · {{ currentTrait.name }}</span>
            <span v-else> · the founder</span>
            <span class="scn-StatHint"> (generation {{ store.generation }})</span>
            <button type="button" class="scn-LinkButton" data-testid="open-family-tree" @click="store.familyTreeOpen = true">
              Family tree
            </button>
          </p>

          <div class="scn-HustleRow">
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
              Scandal: income x{{ store.incomePenalty.mult }} ({{ store.incomePenalty.remainingSec }}s)
            </span>
            <span v-if="store.isAutoBuyFrozen" class="scn-BuffPill scn-BuffPill-freeze">
              Inquiry: Automation paused ({{ store.autoBuyFreezeRemainingSec }}s)
            </span>
          </div>

          <button
            ref="payButtonRef"
            type="button"
            class="scn-PrimaryAction"
            @click="emit('paid', $event)"
          >
            Get paid
          </button>
        </div>
      </div>

      <div class="lyt-Column">
        <div class="scn-StatsGrid">
          <div class="scn-StatBox">
            <div class="scn-DataTitle">Money</div>
            <div class="scn-DataValue">{{ formatCurrency(store.money) }}</div>
          </div>
          <div class="scn-StatBox">
            <div class="scn-DataTitle">Net worth</div>
            <div class="scn-DataValue">{{ formatCurrency(store.netWorth) }}</div>
          </div>
          <div class="scn-StatBox">
            <div class="scn-DataTitle">Money per second</div>
            <div class="scn-DataValue">{{ formatCurrency(store.moneyPerSecond) }}</div>
          </div>
          <div class="scn-StatBox">
            <div class="scn-DataTitle">Money per click</div>
            <div class="scn-DataValue">{{ formatCurrency(store.moneyPerClick) }}</div>
          </div>
          <div class="scn-StatBox">
            <div class="scn-DataTitle">Lifetime earnings</div>
            <div class="scn-DataValue">{{ formatCurrency(store.lifetimeEarned) }}</div>
            <div class="scn-StatHint">
              Retiring now pays +{{ store.legacyOnRetire }} Legacy
            </div>
          </div>
          <div class="scn-StatBox">
            <div class="scn-DataTitle">Legacy &amp; Interns</div>
            <div class="scn-DataValue">
              {{ store.legacyPoints }} (x{{ legacyMultLabel }}) · {{ store.autoClickers }} intern{{ store.autoClickers === 1 ? '' : 's' }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { SOCIAL_CLASSES } from '../data/classes'
import { useGameStore } from '../stores/game'
import { formatCurrency, formatMultiplier } from '../utils/format'
import { TRAITS_BY_ID } from '../data/heirs'

const emit = defineEmits<{
  (e: 'paid', ev: MouseEvent): void
}>()

const store = useGameStore()
const currentTrait = computed(() => (store.heir.traitId ? TRAITS_BY_ID[store.heir.traitId] : null))
const payButtonRef = ref<HTMLButtonElement | null>(null)

const legacyMultLabel = computed(() => formatMultiplier(store.legacyMultiplier))

defineExpose({ payButtonRef })
</script>
