<template>
  <div
    v-if="store.settingsOpen"
    class="scn-ModalBackdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="settings-title"
    data-testid="settings"
    @click.self="store.settingsOpen = false"
  >
    <div class="scn-Modal scn-Modal-wide">
      <div class="scn-ModalTop">
        <span class="scn-ModalKicker scn-ModalKicker-purple">The study</span>
        <h2 id="settings-title">Settings</h2>
      </div>

      <div class="scn-SettingsList">
        <div class="scn-SettingRow">
          <div>
            <strong>Play without tapping</strong>
            <p class="scn-StatHint">
              Get paid goes. Instead the family draws Universal Credit (an allowance, for heirs) worth two taps a second,
              Hustle holds steady and Grindset Coaching raises it. Switch either way, any time.
            </p>
          </div>
          <button
            type="button"
            class="scn-Action scn-Action-outline"
            :class="{ 'scn-Action-activeToggle': store.noTap }"
            data-testid="toggle-no-tap"
            @click="store.toggleNoTap()"
          >
            {{ store.noTap ? 'On' : 'Off' }}
          </button>
        </div>

        <div v-if="store.automationLine > 0" class="scn-SettingRow">
          <div>
            <strong>Compact auto</strong>
            <p class="scn-StatHint">Cards set to Automate fold down to a single line.</p>
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
            <strong>Sound</strong>
          </div>
          <button type="button" class="scn-Action scn-Action-outline" data-testid="toggle-sound" @click="store.toggleMute()">
            {{ store.muted ? 'Off' : 'On' }}
          </button>
        </div>
      </div>

      <div class="scn-SettingsActions">
        <button type="button" class="scn-Action scn-Action-outline" data-testid="open-intro" @click="openIntro">How to play</button>
        <a class="scn-Action scn-Action-outline" href="./cards.html" target="_blank" rel="noopener" data-testid="open-card-index">Card index</a>
        <button type="button" class="scn-Action scn-Action-outline" data-testid="download-save" @click="downloadSave">
          Download save
        </button>
        <button type="button" class="scn-Action" data-testid="open-reset" @click="reset">Reset game</button>
      </div>

      <div class="scn-ModalFooter">
        <button type="button" class="scn-Action scn-Action-purple" data-testid="close-settings" @click="store.settingsOpen = false">
          Done
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { useEscapeKey } from '../utils/useEscapeKey'

const emit = defineEmits<{ (e: 'reset'): void }>()

const store = useGameStore()
useEscapeKey(() => store.settingsOpen, () => (store.settingsOpen = false))

function openIntro(): void {
  store.settingsOpen = false
  store.openIntro()
}

function reset(): void {
  store.settingsOpen = false
  emit('reset')
}

// Downloads the save JSON, play log included, as a file for sharing or backup
function downloadSave(): void {
  const blob = new Blob([store.exportSave(Date.now())], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
  link.href = url
  link.download = `incremental-capitalism-${store.familySurname.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-gen${store.generation}-${stamp}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
</script>
