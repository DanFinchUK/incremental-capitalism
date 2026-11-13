<template>
  <div
    v-if="store.achievementsOpen"
    class="scn-ModalBackdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="achievements-title"
    data-testid="achievements"
    @click.self="store.achievementsOpen = false"
  >
    <div class="scn-Modal scn-Modal-xl">
      <div class="scn-DrawerHeader">
        <div class="scn-ModalTop">
          <span class="scn-ModalKicker scn-ModalKicker-purple">Honours List · {{ earned }} / {{ ACHIEVEMENTS.length }}</span>
          <h2 id="achievements-title">Achievements</h2>
        </div>
        <button type="button" class="scn-Action scn-Action-outline" @click="store.achievementsOpen = false">Close</button>
      </div>
      <p class="scn-CardMeta">Each one adds {{ bonusPct }}% to all income, permanently. Currently +{{ earned * bonusPct }}%.</p>
      <div class="scn-AchievementGrid">
        <article
          v-for="a in ACHIEVEMENTS"
          :key="a.id"
          class="scn-Achievement"
          :class="{ 'scn-Achievement-earned': has(a.id) }"
        >
          <strong>{{ a.hidden && !has(a.id) ? '???' : a.name }}</strong>
          <span class="scn-AutoLine">{{ a.hidden && !has(a.id) ? 'Keep playing to find out.' : a.description }}</span>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ACHIEVEMENTS, ACHIEVEMENT_INCOME_BONUS } from '../data/achievements'
import { useGameStore } from '../stores/game'

const store = useGameStore()
const bonusPct = Math.round(ACHIEVEMENT_INCOME_BONUS * 100)
const earned = computed(() => store.achievements.length)

function has(id: string): boolean {
  return store.achievements.includes(id)
}
</script>
