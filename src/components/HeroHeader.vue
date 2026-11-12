<template>
  <div class="lyt-Header">
    <div class="lyt-Columns">
      <div class="lyt-Column">
        <div class="lyt-Items">
          <div class="scn-ClassCard">
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

            <p v-if="store.classStatus.next">
              Next social class ({{ store.classStatus.next.label }}) in
              {{ formatCurrency(Math.max(0, store.classStatus.next.threshold - store.netWorth)) }}
            </p>
            <p v-else>Top of the British class pyramid reached.</p>
          </div>

          <div class="scn-HustleRow">
            <span v-if="store.hustleMultiplier > 1.01" class="scn-BuffPill scn-BuffPill-streak">
              {{ store.hustleMultiplier.toFixed(1) }}x Hustle
            </span>
            <span v-if="store.isBullRunActive" class="scn-BuffPill">
              5x Bull Run ({{ store.bullRunRemainingSec }}s)
            </span>
            <span v-if="store.isOvertimeActive" class="scn-BuffPill">
              7x Overtime ({{ store.overtimeRemainingSec }}s)
            </span>
            <span v-if="store.isAutoBuyFrozen" class="scn-BuffPill scn-BuffPill-freeze">
              Inquiry: Auto-buy paused ({{ store.autoBuyFreezeRemainingSec }}s)
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
import { useGameStore } from '../stores/game'
import { formatCurrency } from '../utils/format'

const emit = defineEmits<{
  (e: 'paid', ev: MouseEvent): void
}>()

const store = useGameStore()
const payButtonRef = ref<HTMLButtonElement | null>(null)

const legacyMultLabel = computed(() =>
  store.legacyMultiplier.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
)

defineExpose({ payButtonRef })
</script>
