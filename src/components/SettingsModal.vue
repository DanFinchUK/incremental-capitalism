<template>
  <div
    v-if="store.settingsOpen"
    class="scn-ModalBackdrop scn-ModalBackdrop-over"
    role="dialog"
    aria-modal="true"
    aria-labelledby="settings-title"
    data-testid="settings"
    @click.self="store.settingsOpen = false"
  >
    <div class="scn-Modal scn-Modal-wide">
      <div class="scn-ModalTop">
        <span class="scn-ModalKicker scn-ModalKicker-accent">The study</span>
        <h2 id="settings-title">Settings</h2>
      </div>

      <div class="scn-SettingsList">
        <div class="scn-SettingRow">
          <div>
            <strong>Play without tapping</strong>
            <p class="scn-StatHint">
              "Get paid" goes. Instead the family draws Universal Credit (an allowance, for heirs) worth two taps a second,
              Hustle holds steady and Grindset Coaching raises it. Switch either way, any time.
            </p>
            <p v-if="store.scenarioDef.noTap !== undefined" class="scn-StatHint" data-testid="no-tap-locked">
              Set by the {{ store.scenarioDef.name }} scenario for this dynasty.
            </p>
          </div>
          <button
            type="button"
            class="scn-Action scn-Action-outline"
            :class="{ 'scn-Action-activeToggle': store.noTap }"
            data-testid="toggle-no-tap"
            :disabled="store.scenarioDef.noTap !== undefined"
            @click="store.toggleNoTap()"
          >
            {{ store.noTap ? 'On' : 'Off' }}
          </button>
        </div>

        <div v-if="store.hasBuyers" class="scn-SettingRow">
          <div>
            <strong>Compact auto</strong>
            <p class="scn-StatHint">Cards set to "Automate" fold down to a single line.</p>
          </div>
          <button
            type="button"
            class="scn-Action scn-Action-outline"
            :class="{ 'scn-Action-activeToggle': store.compactAutoBuy }"
            data-testid="toggle-compact-autobuy"
            @click="store.toggleCompactAutoBuy()"
          >
            {{ store.compactAutoBuy ? 'On' : 'Off' }}
          </button>
        </div>

        <div class="scn-SettingRow">
          <div>
            <label for="decor-select"><strong>Decor</strong></label>
            <p class="scn-StatHint">Follows your class. Any room the family has reached can be kept instead.</p>
          </div>
          <select id="decor-select" v-model="decor" class="scn-Select" data-testid="decor-select">
            <option value="auto">Follow my class ({{ classRoomName }})</option>
            <option v-for="r in store.unlockedRooms" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
        </div>

        <div class="scn-SettingRow">
          <div>
            <strong>Sound</strong>
          </div>
          <button type="button" class="scn-Action scn-Action-outline" data-testid="toggle-sound" @click="store.toggleMute()">
            {{ store.muted ? 'Off' : 'On' }}
          </button>
        </div>
      </div>

      <div class="scn-SettingsActions">
        <button type="button" class="scn-Action scn-Action-outline" data-testid="open-intro" @click="openIntro">How to play</button>
        <button type="button" class="scn-Action scn-Action-outline" data-testid="download-save" @click="downloadSave">
          Download save
        </button>
        <button v-if="!store.menuOpen" type="button" class="scn-Action scn-Action-outline" data-testid="settings-new-bloodline" @click="newBloodline">
          New bloodline
        </button>
        <button type="button" class="scn-Action" data-testid="open-reset" @click="reset">Reset game</button>
      </div>

      <div class="scn-ModalFooter">
        <button
          v-if="!store.menuOpen"
          type="button"
          class="scn-Action scn-Action-outline"
          data-testid="settings-main-menu"
          @click="toMenu"
        >
          Main menu
        </button>
        <button type="button" class="scn-Action scn-Action-accent" data-testid="close-settings" @click="store.settingsOpen = false">
          Done
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { useEscapeKey } from '../utils/useEscapeKey'
import { roomForClass, type RoomId } from '../data/rooms'
import { downloadSave as saveToFile } from '../utils/downloadSave'

const emit = defineEmits<{ (e: 'reset'): void; (e: 'new-bloodline'): void }>()

const store = useGameStore()
useEscapeKey(() => store.settingsOpen, () => (store.settingsOpen = false))

function toMenu(): void {
  store.settingsOpen = false
  store.openMenu()
}

const decor = computed<RoomId | 'auto'>({
  get: () => store.decor,
  set: (choice) => store.setDecor(choice)
})
const classRoomName = computed(() => roomForClass(store.classStatus.current.level).name)

function openIntro(): void {
  store.settingsOpen = false
  store.openIntro()
}

function newBloodline(): void {
  store.settingsOpen = false
  emit('new-bloodline')
}

function reset(): void {
  store.settingsOpen = false
  emit('reset')
}

function downloadSave(): void {
  saveToFile(store)
}
</script>
