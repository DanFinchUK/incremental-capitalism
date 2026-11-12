<template>
  <div
    v-if="store.classModalOpen"
    class="scn-ModalBackdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="class-modal-title"
    @click.self="store.closeClassModal()"
  >
    <div class="scn-Modal scn-Modal-xl" data-testid="class-modal">
      <div class="scn-DrawerHeader">
        <div class="scn-ModalTop">
          <span class="scn-ModalKicker scn-ModalKicker-purple">
            {{ celebratedDef ? 'New Lifetime Milestone' : 'The Great British Class Survey' }}
          </span>
          <h2 id="class-modal-title">
            {{ celebratedDef ? `Welcome to the ${celebratedDef.label}` : `British Class Pyramid (${store.highestClassReached + 1}/7 unlocked)` }}
          </h2>
        </div>
        <button type="button" class="scn-Action scn-Action-outline" @click="store.closeClassModal()">
          Close
        </button>
      </div>

      <div v-if="celebratedDef" class="scn-ModalCallout scn-ModalCallout-perk">
        <div><strong>{{ celebratedDef.perkSummary }}</strong></div>
        <div>{{ celebratedDef.initiationNote }}</div>
      </div>

      <div class="scn-PyramidList">
        <div
          v-for="cls in pyramidRungs"
          :key="cls.level"
          class="scn-PyramidRung"
          :class="{
            'scn-PyramidRung-current': cls.level === store.classStatus.current.level,
            'scn-PyramidRung-celebrated': cls.level === store.celebratedClassLevel,
            'scn-PyramidRung-mystery': cls.level > store.highestClassReached + 1
          }"
        >
          <template v-if="cls.level <= store.highestClassReached">
            <div class="scn-PyramidHeader">
              <div class="scn-PyramidTitleRow">
                <span class="scn-PyramidTier">Tier {{ cls.level }}</span>
                <strong class="scn-PyramidName">{{ cls.label }}</strong>
                <span v-if="cls.level === store.celebratedClassLevel" class="scn-NextTag">Newly unlocked</span>
                <span v-else-if="cls.level === store.classStatus.current.level" class="scn-MilestoneBadge">Current</span>
              </div>
              <span class="scn-PyramidReq">{{ thresholdLabel(cls.threshold) }}</span>
            </div>
            <div class="scn-PyramidPerk">{{ cls.perkSummary }}</div>
            <p class="scn-AutoLine">{{ cls.description }}</p>
            <p class="scn-PyramidGift">{{ cls.initiationNote }}</p>
          </template>

          <template v-else-if="cls.level === store.highestClassReached + 1">
            <div class="scn-PyramidHeader">
              <div class="scn-PyramidTitleRow">
                <span class="scn-PyramidTier">Tier {{ cls.level }}</span>
                <strong class="scn-PyramidName">{{ cls.label }}</strong>
                <span class="scn-MilestoneBadge">Next target</span>
              </div>
              <span class="scn-PyramidReq">Requires {{ thresholdLabel(cls.threshold) }} net worth</span>
            </div>
            <div class="scn-PyramidPerk">{{ cls.perkSummary }}</div>
            <p class="scn-AutoLine">Reach {{ thresholdLabel(cls.threshold) }} net worth in a single run to join this circle.</p>
          </template>

          <template v-else>
            <div class="scn-PyramidHeader">
              <div class="scn-PyramidTitleRow">
                <span class="scn-PyramidTier">Tier {{ cls.level }}</span>
                <strong class="scn-PyramidName">???</strong>
              </div>
              <span class="scn-PyramidReq">Requires {{ thresholdLabel(cls.threshold) }} net worth</span>
            </div>
            <p class="scn-AutoLine">Privilege: ??? — climb higher on the social ladder to reveal this tier.</p>
          </template>
        </div>
      </div>

      <div class="scn-ModalFooter">
        <button
          type="button"
          class="scn-Action scn-Action-purple"
          @click="store.closeClassModal()"
        >
          {{ celebratedDef ? 'Assume your rightful place' : 'Back to the market' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { SOCIAL_CLASSES } from '../data/classes'
import { useGameStore } from '../stores/game'
import { formatCurrency } from '../utils/format'

const store = useGameStore()

const pyramidRungs = computed(() => [...SOCIAL_CLASSES].reverse())

const celebratedDef = computed(() =>
  store.celebratedClassLevel !== null
    ? (SOCIAL_CLASSES[store.celebratedClassLevel] ?? null)
    : null
)

function thresholdLabel(threshold: number): string {
  return threshold <= 0 ? '£0.00' : formatCurrency(threshold + 1)
}

function onKeyDown(ev: KeyboardEvent): void {
  if (store.classModalOpen && ev.key === 'Escape') {
    store.closeClassModal()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
})
</script>
