<template>
  <div
    v-if="mode !== null"
    class="scn-ModalBackdrop"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="mode === 'retire' ? 'retire-modal-title' : mode === 'bloodline' ? 'bloodline-modal-title' : 'reset-modal-title'"
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
        Wind up Jobs and Businesses and hand {{ inheritancePct }}% of net worth to your chosen heir. Legacy, perks, your Personal Assistant, and all bloodline traits carry forward.
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
          <div class="scn-DataTitle">Deepest gate</div>
          <div class="scn-DataValue">{{ store.gatesBeaten }} / 9</div>
        </div>
      </div>

      <div class="scn-StatBox" data-testid="heir-inheritance">
        <div class="scn-DataTitle">Heir's trust fund</div>
        <div class="scn-DataValue">{{ formatCurrency(store.heirInheritancePreview) }}</div>
      </div>

      <div v-if="store.legacyPoints === 0" class="scn-ModalCallout scn-ModalCallout-perk">
        <p>
          <strong>First retirement unlock:</strong> grants <strong>1 Free Unpaid Intern</strong> and opens the Old Boys' Network.
        </p>
      </div>

      <p class="scn-AutoLine">
        Deepest gate this generation: {{ store.gatesBeaten }} of 9.
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
      v-else-if="mode === 'bloodline'"
      class="scn-Modal scn-Modal-wide scn-Modal-danger"
      data-testid="bloodline-modal"
    >
      <div class="scn-ModalTop">
        <span class="scn-ModalKicker scn-ModalKicker-danger">Quiet Emigration</span>
        <h2 id="bloodline-modal-title">Fold the {{ store.familySurname }} Bloodline</h2>
      </div>

      <p class="scn-CardMeta">
        Retire this disgraced or dead-end family line and begin Generation 1 with a fresh founder. Achievements, Peerage titles and best split times stay intact.
      </p>

      <div class="scn-ModalCallout scn-ModalCallout-danger">
        <div><strong>Left behind with this family:</strong></div>
        <div>• {{ store.legacyPoints }} Legacy, perks, family office and stacked traits</div>
      </div>

      <div class="scn-ModalFooter">
        <button
          type="button"
          class="scn-Action scn-Action-outline"
          @click="emit('close')"
        >
          Keep going
        </button>
        <button
          type="button"
          class="scn-Action scn-Action-danger"
          data-testid="confirm-bloodline-btn"
          @click="emit('confirm-bloodline')"
        >
          Start new bloodline
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
        <div>• {{ formatCurrency(store.lifetimeEarned) }} in lifetime earnings</div>
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
import { HEIR_INHERITANCE_SHARE, legacyMultiplier } from '../engine/economy'
import { useGameStore } from '../stores/game'
import { formatCurrency, formatMultiplier } from '../utils/format'

export type ConfirmDialogMode = 'retire' | 'bloodline' | 'reset' | null

const props = defineProps<{
  mode: ConfirmDialogMode
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm-retire'): void
  (e: 'confirm-bloodline'): void
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

const gain = computed(() => store.legacyOnRetire)
const nextPoints = computed(() => store.legacyPoints + gain.value)
const inheritancePct = computed(() => Math.round((HEIR_INHERITANCE_SHARE + store.modifiers.trustFundShareAdd) * 100))
const currMult = computed(() => formatMultiplier(store.legacyMultiplier))
const nextMult = computed(() => formatMultiplier(legacyMultiplier(nextPoints.value, store.modifiers.legacyScale)))
async function copySaveBackup(): Promise<void> {
  const raw = store.exportSave(Date.now())
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
