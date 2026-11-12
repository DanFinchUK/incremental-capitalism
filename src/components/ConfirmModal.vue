<template>
  <div
    v-if="mode !== null"
    class="scn-ModalBackdrop"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="mode === 'retire' ? 'retire-modal-title' : 'reset-modal-title'"
    @click.self="emit('close')"
  >
    <div
      v-if="mode === 'retire'"
      class="scn-Modal scn-Modal-wide"
      data-testid="retire-modal"
    >
      <div class="scn-ModalTop">
        <span class="scn-ModalKicker scn-ModalKicker-purple">Estate Handover</span>
        <h2 id="retire-modal-title">Deploy Golden Parachute</h2>
      </div>

      <p class="scn-CardMeta">
        Cash out this run's holdings into permanent generational privilege. Your cash, active jobs,
        and active businesses reset, while Legacy, perks, and lifetime purchase counts carry forward.
      </p>

      <div class="scn-ModalGrid">
        <div class="scn-StatBox">
          <div class="scn-DataTitle">Legacy points</div>
          <div class="scn-DataValue">
            {{ store.legacyPoints }} → <span class="scn-DeltaInline">{{ nextPoints }} (+{{ gain }})</span>
          </div>
        </div>
        <div class="scn-StatBox">
          <div class="scn-DataTitle">Income multiplier</div>
          <div class="scn-DataValue">
            x{{ currMult }} → <span class="scn-DeltaInline">x{{ nextMult }}</span>
          </div>
        </div>
        <div class="scn-StatBox">
          <div class="scn-DataTitle">Unspent perks</div>
          <div class="scn-DataValue">
            {{ store.legacyAvailable }} → <span class="scn-DeltaInline">{{ store.legacyAvailable + gain }}</span>
          </div>
        </div>
        <div class="scn-StatBox">
          <div class="scn-DataTitle">Trust Fund seed</div>
          <div class="scn-DataValue">{{ formatCurrency(seedCash) }}</div>
        </div>
      </div>

      <div v-if="store.legacyPoints === 0" class="scn-ModalCallout scn-ModalCallout-perk">
        <p>
          <strong>First retirement unlock:</strong> Activates <strong>Business Auto-buy</strong> on every
          venture that has reached its lifetime purchase goal, and opens the Old Boys' Network.
        </p>
      </div>

      <p class="scn-AutoLine">
        Progress toward +{{ gain + 1 }} Legacy: {{ bracketPct }}% ({{ formatCurrency(remainingToNext) }} more lifetime earnings needed).
      </p>

      <div class="scn-ModalFooter">
        <button
          type="button"
          class="scn-Action scn-Action-outline"
          @click="emit('close')"
        >
          Stay in the market
        </button>
        <button
          type="button"
          class="scn-Action scn-Action-purple"
          data-testid="confirm-retire-btn"
          @click="emit('confirm-retire')"
        >
          Take Golden Parachute (+{{ gain }})
        </button>
      </div>
    </div>

    <div
      v-else
      class="scn-Modal scn-Modal-wide scn-Modal-danger"
      data-testid="reset-modal"
    >
      <div class="scn-ModalTop">
        <span class="scn-ModalKicker scn-ModalKicker-danger">HMRC Dawn Raid</span>
        <h2 id="reset-modal-title">Total Liquidation</h2>
      </div>

      <p class="scn-CardMeta">
        This permanently shreds every offshore ledger and returns you to £0.00 on a zero-hours bike
        with zero connections.
      </p>

      <div class="scn-ModalCallout scn-ModalCallout-danger">
        <div><strong>At stake right now:</strong></div>
        <div>• {{ store.legacyPoints }} Legacy point{{ store.legacyPoints === 1 ? '' : 's' }} &amp; all Old Boys' Network perks</div>
        <div>• {{ formatCurrency(store.lifetimeEarned) }} in lifetime earnings &amp; auto-buy unlock counts</div>
      </div>

      <div class="scn-BackupRow">
        <span class="scn-AutoLine">Want a safety copy of your save state first?</span>
        <button
          type="button"
          class="scn-Action scn-Action-outline"
          data-testid="copy-save-btn"
          @click="copySaveBackup"
        >
          {{ copied ? 'Copied JSON!' : 'Copy save JSON' }}
        </button>
      </div>

      <label class="scn-DangerAck">
        <input
          v-model="resetAck"
          type="checkbox"
          data-testid="confirm-reset-checkbox"
        >
        <span>Wipe Legacy points, perks, and all lifetime progress</span>
      </label>

      <div class="scn-ModalFooter">
        <button
          type="button"
          class="scn-Action scn-Action-outline"
          @click="emit('close')"
        >
          Keep my empire
        </button>
        <button
          type="button"
          class="scn-Action scn-Action-danger"
          data-testid="confirm-reset-btn"
          :disabled="!resetAck"
          @click="emit('confirm-reset')"
        >
          Wipe everything
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { legacyMultiplier, trustFundStartingCash } from '../engine/economy'
import { STORAGE_KEY } from '../engine/migration'
import { useGameStore } from '../stores/game'
import { formatCurrency } from '../utils/format'

export type ConfirmDialogMode = 'retire' | 'reset' | null

const props = defineProps<{
  mode: ConfirmDialogMode
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm-retire'): void
  (e: 'confirm-reset'): void
}>()

const store = useGameStore()
const resetAck = ref(false)
const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.mode,
  () => {
    resetAck.value = false
    copied.value = false
  }
)

const gain = computed(() => store.legacyGain)
const nextPoints = computed(() => store.legacyPoints + gain.value)
const currMult = computed(() => formatMult(store.legacyMultiplier))
const nextMult = computed(() => formatMult(legacyMultiplier(nextPoints.value)))
const seedCash = computed(() => trustFundStartingCash(store.perks.trustFund))
const bracketPct = computed(() => Math.round(store.legacyBracket.progress * 100))
const remainingToNext = computed(() => Math.max(0, store.legacyBracket.nextThreshold - store.lifetimeEarned))

function formatMult(val: number): string {
  return val.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
}

async function copySaveBackup(): Promise<void> {
  store.flushSave(Date.now())
  const raw = localStorage.getItem(STORAGE_KEY) ?? ''
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(raw)
      copied.value = true
      if (copyTimer !== null) {
        clearTimeout(copyTimer)
      }
      copyTimer = setTimeout(() => {
        copied.value = false
      }, 2000)
    } catch {
      copied.value = false
    }
  }
}

function onKeyDown(ev: KeyboardEvent): void {
  if (props.mode !== null && ev.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  if (copyTimer !== null) {
    clearTimeout(copyTimer)
  }
})
</script>
