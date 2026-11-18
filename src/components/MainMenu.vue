<template>
  <Transition name="screen" appear>
    <div
      v-if="store.menuOpen && !store.census"
      class="scn-ModalBackdrop scn-MenuBackdrop ttl-Screen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="menu-title"
      data-testid="main-menu"
      ref="screen"
    >
      <!-- Money falling from somewhere higher up -->
      <div class="ttl-Rain" aria-hidden="true">
        <span v-for="c in COINS" :key="c.id" class="ttl-Coin" :style="c.style">£</span>
      </div>

      <div class="ttl-Stage">
        <header class="ttl-Head" :class="{ 'ttl-Head-compact': view !== 'main' }">
          <FamilyCrest v-if="view === 'main' && !fresh" class="ttl-Crest" :surname="store.familySurname" :titles="store.titles" />
          <h1 id="menu-title" class="ttl-Title">
            <span class="ttl-TitleSmall">Incremental</span>
            <span class="ttl-TitleBig">Capitalism</span>
          </h1>
          <p v-if="view === 'main'" class="ttl-Tagline">From a zero-hours rota to a dukedom</p>
          <div class="ttl-Rule" aria-hidden="true"><span></span></div>
        </header>

        <template v-if="view === 'main'">
          <button type="button" class="ttl-Continue" data-testid="menu-continue" @click="carryOn">
            <span class="ttl-ContinueLabel">{{ fresh ? 'Begin' : 'Continue' }}</span>
            <span class="ttl-ContinueFamily">{{ fresh ? 'A new family' : `The ${pluralSurname(store.familySurname)}` }}</span>
            <span class="ttl-ContinueLine">{{ continueLine }}</span>
            <span v-if="!fresh" class="ttl-ContinueMotto">{{ arms.motto }}: “{{ arms.translation }}”</span>
          </button>

          <nav class="ttl-Nav" aria-label="Main menu">
            <button v-if="!fresh" type="button" class="ttl-Item" data-testid="menu-new-dynasty" @click="newDynasty">
              <span>{{ newDynastyLabel }}</span>
            </button>
            <button type="button" class="ttl-Item" data-testid="menu-families" @click="openFamilies">
              <span>Families</span>
              <small>{{ store.saveIndex.slots.length }} of {{ MAX_SAVES }} seats</small>
            </button>
            <button type="button" class="ttl-Item" data-testid="menu-hall" @click="store.hallOpen = true">
              <span>Hall of Dynasties</span>
              <small v-if="best">Best: the {{ pluralSurname(best.surname) }}, {{ formatDuration(best.activeMs / 1000) }}</small>
            </button>
            <button type="button" class="ttl-Item" data-testid="menu-achievements" @click="store.achievementsOpen = true">
              <span>Achievements</span>
              <small>{{ store.achievements.length }} of {{ ACHIEVEMENTS.length }}</small>
            </button>
            <button type="button" class="ttl-Item" data-testid="menu-how-to-play" @click="view = 'how'">
              <span>How to play</span>
            </button>
            <button type="button" class="ttl-Item" data-testid="menu-settings" @click="view = 'settings'">
              <span>Settings</span>
            </button>
          </nav>
        </template>

        <!-- How to play, as a page of the menu -->
        <section v-else-if="view === 'how'" class="ttl-Page" data-testid="menu-how" aria-labelledby="menu-how-title">
          <h2 id="menu-how-title" class="ttl-PageTitle">How to play</h2>
          <article v-for="(page, i) in INTRO_PAGES" :key="i" class="ttl-HowPage">
            <span class="ttl-PageKicker">{{ page.kicker }}</span>
            <h3>{{ page.title }}</h3>
            <p v-for="(para, j) in page.body" :key="j">{{ para }}</p>
            <p v-if="page.tip" class="ttl-Tip">{{ page.tip }}</p>
          </article>
          <button type="button" class="ttl-Item ttl-Back" data-testid="menu-back" @click="view = 'main'">Back</button>
        </section>

        <!-- Every family on the go, one in play: switch, start another, remove one -->
        <section v-else-if="view === 'families'" class="ttl-Page" data-testid="menu-families-page" aria-labelledby="menu-families-title">
          <h2 id="menu-families-title" class="ttl-PageTitle">Families</h2>
          <ul class="ttl-Saves">
            <li
              v-for="slot in store.saveIndex.slots"
              :key="slot.id"
              class="ttl-Save"
              :class="{ 'ttl-Save-active': slot.id === store.activeSlotId }"
              :data-testid="`save-${slot.id}`"
            >
              <div class="ttl-SaveText">
                <strong>{{ saveName(slot) }}</strong>
                <span>{{ saveLine(slot) }}</span>
              </div>
              <div class="ttl-SaveActions">
                <template v-if="slot.id === store.activeSlotId">
                  <span class="ttl-SaveBadge">In residence</span>
                  <button type="button" class="ttl-Toggle" :data-testid="`download-${slot.id}`" @click="downloadSave(store, slot.id)">Download</button>
                </template>
                <template v-else-if="removing === slot.id">
                  <button type="button" class="ttl-Toggle ttl-Toggle-danger" :data-testid="`remove-confirm-${slot.id}`" @click="confirmRemove(slot.id)">
                    Disown them
                  </button>
                  <button type="button" class="ttl-Toggle" @click="removing = null">Spare them</button>
                </template>
                <template v-else>
                  <button type="button" class="ttl-Toggle ttl-Toggle-on" :data-testid="`play-${slot.id}`" @click="store.playSave(slot.id)">Play</button>
                  <button type="button" class="ttl-Toggle" :data-testid="`download-${slot.id}`" @click="downloadSave(store, slot.id)">Download</button>
                  <button type="button" class="ttl-Toggle" :data-testid="`remove-${slot.id}`" @click="removing = slot.id">Disown</button>
                </template>
              </div>
            </li>
          </ul>
          <div v-if="store.canAddSave" class="ttl-Setting ttl-Setting-stack">
            <div>
              <strong>Another family</strong>
              <p>Every great house keeps a spare. Found another family in a seat of its own; the rest carry on without noticing.</p>
              <p>Its ladder, fixed for good: the usual one, or the ladder trial, where each rung is harder to reach and to keep buying.</p>
            </div>
            <div class="ttl-SaveActions">
              <button type="button" class="ttl-Toggle" data-testid="new-save-classic" @click="store.newSave('classic')">The usual ladder</button>
              <button type="button" class="ttl-Toggle" data-testid="new-save-trial" @click="store.newSave('trial')">The ladder trial</button>
            </div>
          </div>
          <p v-else class="ttl-SaveNote">All five seats are taken. Disown a family to found another.</p>
          <div class="ttl-Setting">
            <div>
              <strong>Import a family</strong>
              <p>A family's save file, downloaded from here, settled in a seat of its own.</p>
              <p v-if="importFailed" class="ttl-SaveError" data-testid="import-failed">That file isn't a family's save, or every seat is taken.</p>
            </div>
            <label class="ttl-Toggle ttl-Upload" :class="{ 'ttl-Toggle-disabled': !store.canAddSave }">
              Choose file
              <input type="file" accept=".json,application/json" data-testid="import-save" :disabled="!store.canAddSave" @change="importFile" />
            </label>
          </div>
          <button type="button" class="ttl-Item ttl-Back" data-testid="menu-back" @click="view = 'main'">Back</button>
        </section>

        <!-- Settings, as a page of the menu -->
        <section v-else-if="view === 'settings'" class="ttl-Page" data-testid="menu-settings-page" aria-labelledby="menu-settings-title">
          <h2 id="menu-settings-title" class="ttl-PageTitle">Settings</h2>
          <div class="ttl-Setting">
            <div>
              <strong>Play without tapping</strong>
              <p>
                "Get paid" goes. Instead the family draws Universal Credit (an allowance, for heirs) worth two taps a second,
                Hustle holds steady and Grindset Coaching raises it. Switch either way, any time.
              </p>
              <p v-if="store.scenarioDef.noTap !== undefined">Set by the {{ store.scenarioDef.name }} scenario for this dynasty.</p>
            </div>
            <button
              type="button"
              class="ttl-Toggle"
              :aria-pressed="store.noTap"
              data-testid="menu-toggle-no-tap"
              :disabled="store.scenarioDef.noTap !== undefined"
              @click="store.toggleNoTap()"
            >
              {{ store.noTap ? 'On' : 'Off' }}
            </button>
          </div>
          <div v-if="store.hasBuyers" class="ttl-Setting">
            <div>
              <strong>Compact auto</strong>
              <p>Cards set to "Automate" fold down to a single line.</p>
            </div>
            <button type="button" class="ttl-Toggle" :aria-pressed="store.compactAutoBuy" @click="store.toggleCompactAutoBuy()">
              {{ store.compactAutoBuy ? 'On' : 'Off' }}
            </button>
          </div>
          <div class="ttl-Setting ttl-Setting-stack">
            <div>
              <label for="menu-decor"><strong>Decor</strong></label>
              <p>Follows your class. Any room one of your families has reached can be kept instead.</p>
            </div>
            <select id="menu-decor" v-model="decor" class="ttl-Select">
              <option value="auto">Follow my class ({{ classRoomName }})</option>
              <option v-for="r in store.unlockedRooms" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
          </div>
          <div class="ttl-Setting">
            <div><strong>Sound</strong></div>
            <button type="button" class="ttl-Toggle" :aria-pressed="!store.muted" data-testid="menu-toggle-sound" @click="store.toggleMute()">
              {{ store.muted ? 'Off' : 'On' }}
            </button>
          </div>
          <nav class="ttl-Nav" aria-label="Settings">
            <button type="button" class="ttl-Item ttl-Item-danger" data-testid="menu-reset" @click="emit('reset')">Reset game</button>
          </nav>
          <button type="button" class="ttl-Item ttl-Back" data-testid="menu-back" @click="view = 'main'">Back</button>
        </section>

        <section v-else class="ttl-Page" data-testid="menu-confirm-abandon" aria-labelledby="menu-confirm-title">
          <h2 id="menu-confirm-title" class="ttl-PageTitle">{{ confirmTitle }}</h2>
          <div class="ttl-Confirm">
            <p v-if="store.dynastyComplete">
              The new family starts with nothing: no money, no titles, no staff. The {{ store.familySurname }} record goes in the
              Hall of Dynasties. Achievements and settings stay.
            </p>
            <p v-else-if="fresh">Every family plays by somebody's rules. Choose this one's.</p>
            <p v-else>
              The {{ pluralSurname(store.familySurname) }} are {{ formatDuration(store.dynastyMs / 1000) }} into their climb.
              Abandoned, they go back to whatever they were doing before, and an unfinished dynasty doesn't go in the Hall.
            </p>
          </div>
          <ScenarioPicker v-if="store.dynastyComplete || scenariosOpen(store.hall)" v-model="next" />
          <div class="ttl-ConfirmActions">
            <button type="button" class="ttl-Item ttl-Item-quiet" data-testid="menu-back" @click="view = 'main'">Back</button>
            <button
              type="button"
              class="ttl-Item"
              :class="{ 'ttl-Item-danger': !fresh && !store.dynastyComplete, 'ttl-Item-gilt': store.dynastyComplete }"
              data-testid="menu-confirm-new-dynasty"
              @click="confirmNew"
            >
              {{ confirmLabel }}
            </button>
          </div>
        </section>

        <footer class="ttl-Foot">Empire &amp; Privilege Edition</footer>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
// The way in: carry on with the family, give it up for another, look round
// the Hall, read the rules or change the settings. The game waits behind it.
import { computed, ref, watch } from 'vue'
import FamilyCrest from './FamilyCrest.vue'
import ScenarioPicker from './ScenarioPicker.vue'
import { ACHIEVEMENTS } from '../data/achievements'
import { INTRO_PAGES } from '../data/intro'
import { roomForClass, type RoomId } from '../data/rooms'
import type { ScenarioId } from '../data/scenarios'
import { LADDER_TRIAL } from '../data/trial'
import { MAX_SAVES, type SaveSlot } from '../data/saveSlots'
import { SCENARIOS_BY_ID, readScenarioId } from '../data/scenarios'
import { armsFor } from '../engine/crest'
import { bestDynasty, scenariosOpen } from '../engine/hall'
import { peerageRank } from '../engine/peerage'
import { useGameStore } from '../stores/game'
import { downloadSave } from '../utils/downloadSave'
import { formatDuration, pluralSurname } from '../utils/format'

const emit = defineEmits<{ (e: 'reset'): void }>()

const store = useGameStore()
// The menu's pages: the menu itself, the rules, the settings, and asking
// before a family is abandoned
const view = ref<'main' | 'how' | 'settings' | 'confirm' | 'families'>('main')
const screen = ref<HTMLElement | null>(null)
// Each visit starts from the menu itself, unless a finished dynasty sent the
// player straight to founding the next one
watch(
  () => store.menuOpen,
  (open) => {
    if (open && store.menuPage === 'found' && store.dynastyComplete) {
      next.value = store.scenario
      view.value = 'confirm'
    } else if (open && store.menuPage === 'scenario' && fresh.value) {
      newDynasty()
    } else {
      view.value = 'main'
    }
  }
)
// and each page from its top
watch(view, () => {
  if (screen.value) screen.value.scrollTop = 0
})
const next = ref<ScenarioId>('standard')
const best = computed(() => bestDynasty(store.hall))
const arms = computed(() => armsFor(store.familySurname))

// A family that hasn't started: nothing to carry on, only one to begin, and
// no name until it is written into the register
const fresh = computed(() => store.familyIsFresh)

// A new family chooses its scenario first, once there are any, then goes
// into the register
function carryOn(): void {
  if (fresh.value && scenariosOpen(store.hall)) newDynasty()
  else if (fresh.value) store.openCensus()
  else store.closeMenu()
}

const continueLine = computed(() => {
  const scenario = (LADDER_TRIAL ? 'Ladder trial · ' : '') + (store.scenario !== 'standard' ? `${store.scenarioDef.name} · ` : '')
  if (fresh.value) return `${scenario}Not yet in the register`
  if (store.dynastyComplete) return `${scenario}Made Duke in ${formatDuration(store.dynastyMs / 1000)}`
  const rank = store.titles > 0 ? ` · ${peerageRank(store.titles)}` : ''
  return `${scenario}Generation ${store.generation}${rank} · ${formatDuration(store.dynastyMs / 1000)}`
})

const newDynastyLabel = computed(() => {
  return store.dynastyComplete ? 'Found a new dynasty' : 'Abandon this dynasty'
})

// A finished dynasty is founded anew, an unfinished one abandoned, both after
// asking; either way the next family goes into the register
function newDynasty(): void {
  next.value = store.scenario
  view.value = 'confirm'
}

const confirmTitle = computed(() => {
  if (store.dynastyComplete) return 'A new dynasty'
  return fresh.value ? 'Choose a scenario' : 'Abandon this dynasty'
})

const confirmLabel = computed(() => {
  if (store.dynastyComplete) return 'Found the new dynasty'
  return fresh.value ? 'Choose' : 'Abandon them'
})

function confirmNew(): void {
  view.value = 'main'
  if (store.dynastyComplete) store.foundNewDynasty(Date.now(), next.value)
  else store.abandonDynasty(Date.now(), next.value)
}

function openFamilies(): void {
  store.flushSave()
  store.refreshSaves()
  removing.value = null
  importFailed.value = false
  view.value = 'families'
}

const removing = ref<string | null>(null)
const importFailed = ref(false)

function confirmRemove(id: string): void {
  store.removeSave(id)
  removing.value = null
}

async function importFile(ev: Event): Promise<void> {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  importFailed.value = !store.importSave(await file.text())
}

function saveName(slot: SaveSlot): string {
  const sum = slot.summary
  return !sum || sum.fresh ? 'A new family' : `The ${pluralSurname(sum.surname)}`
}

function saveLine(slot: SaveSlot): string {
  const sum = slot.summary
  const parts: string[] = []
  if (slot.tuning === 'trial') parts.push('Ladder trial')
  if (sum && sum.scenario !== 'standard') parts.push(SCENARIOS_BY_ID[readScenarioId(sum.scenario)].name)
  if (!sum || sum.fresh) parts.push('Not yet in the register')
  else if (sum.dynastyComplete) parts.push(`Made Duke in ${formatDuration(sum.dynastyMs / 1000)}`)
  else {
    parts.push(`Generation ${sum.generation}`)
    if (sum.titles > 0) parts.push(peerageRank(sum.titles))
    parts.push(formatDuration(sum.dynastyMs / 1000))
  }
  return parts.join(' · ')
}

const decor = computed<RoomId | 'auto'>({
  get: () => store.decor,
  set: (choice) => store.setDecor(choice)
})
const classRoomName = computed(() => roomForClass(store.classStatus.current.level).name)

// Fixed, so the rain looks the same each visit and costs nothing to work out
const COINS = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  style: {
    left: `${(i * 37 + 7) % 100}%`,
    fontSize: `${14 + (i % 4) * 7}px`,
    animationDuration: `${11 + (i % 5) * 3}s`,
    animationDelay: `${-(i * 2.3) % 17}s`,
    opacity: String(0.12 + (i % 3) * 0.08)
  }
}))

</script>

<style scoped>
.ttl-Screen {
  --ttl-ink: #efe6d2;
  --ttl-dim: #b9ab8c;
  --ttl-gold: #d6a93c;
  --ttl-gold-hi: #f6dd8f;
  --ttl-wine: #3a0d14;
  color-scheme: dark;
  color: var(--ttl-ink);
  background:
    radial-gradient(ellipse 80% 60% at 50% 28%, rgba(214, 169, 60, 0.16), transparent 70%),
    var(--room-damask),
    radial-gradient(ellipse at 50% 35%, #4a1019 0%, #240910 55%, #0c0708 100%);
  background-attachment: fixed;
  padding: 0;
  flex-direction: column;
}

/* Gold leaf on everything that matters */
.ttl-Stage {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 460px;
  margin: auto;
  padding: 36px 20px max(28px, env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 20px;
}

.ttl-Head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.ttl-Crest {
  width: 132px;
  filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.55)) drop-shadow(0 0 30px rgba(214, 169, 60, 0.18));
  margin-bottom: 6px;
  animation: ttl-rise 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) both;
}

.ttl-Title {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
}

.ttl-TitleSmall {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.62em;
  margin-right: -0.62em;
  text-transform: uppercase;
  color: var(--ttl-gold);
  animation: ttl-rise 0.9s 0.1s cubic-bezier(0.2, 0.7, 0.2, 1) both;
}

.ttl-TitleBig {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-weight: 700;
  font-size: clamp(52px, 15vw, 76px);
  letter-spacing: 0.01em;
  margin-top: 4px;
  background: linear-gradient(100deg, #8a6416 0%, #d6a93c 22%, #fff3c4 30%, #d6a93c 38%, #b8892a 60%, #f6dd8f 80%, #8a6416 100%);
  background-size: 250% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 2px 0 rgba(0, 0, 0, 0.6));
  animation:
    ttl-rise 0.9s 0.18s cubic-bezier(0.2, 0.7, 0.2, 1) both,
    ttl-sheen 7s 1.2s ease-in-out infinite;
}

.ttl-Tagline {
  margin: 4px 0 0;
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-style: italic;
  font-size: 19px;
  color: var(--ttl-dim);
  animation: ttl-rise 0.9s 0.26s cubic-bezier(0.2, 0.7, 0.2, 1) both;
}

.ttl-Rule {
  width: 220px;
  height: 1px;
  margin-top: 10px;
  background: linear-gradient(90deg, transparent, var(--ttl-gold), transparent);
  position: relative;
  animation: ttl-fade 1.2s 0.4s both;
}

.ttl-Rule span {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 8px;
  height: 8px;
  background: var(--ttl-gold);
  transform: translate(-50%, -50%) rotate(45deg);
  box-shadow: 0 0 0 3px #240910;
}

/* Carrying on: the family's own card, gilt-edged */
.ttl-Continue {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 18px 20px 16px;
  border: 1px solid var(--ttl-gold);
  border-radius: 4px;
  outline: 1px solid rgba(214, 169, 60, 0.35);
  outline-offset: 4px;
  background: linear-gradient(180deg, rgba(214, 169, 60, 0.16), rgba(214, 169, 60, 0.05)), rgba(12, 7, 8, 0.55);
  color: var(--ttl-ink);
  font: inherit;
  cursor: pointer;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 243, 196, 0.18);
  transition: transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
  animation: ttl-rise 0.9s 0.34s cubic-bezier(0.2, 0.7, 0.2, 1) both;
}

.ttl-Continue:hover {
  transform: translateY(-2px);
  box-shadow: 0 22px 46px rgba(0, 0, 0, 0.5), 0 0 28px rgba(214, 169, 60, 0.25), inset 0 1px 0 rgba(255, 243, 196, 0.25);
}

.ttl-Continue:active {
  transform: translateY(0);
}

.ttl-ContinueLabel {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.4em;
  margin-right: -0.4em;
  text-transform: uppercase;
  color: var(--ttl-gold);
}

.ttl-ContinueFamily {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-weight: 700;
  font-size: 30px;
  line-height: 1.1;
  color: var(--ttl-gold-hi);
  text-wrap: balance;
}

.ttl-ContinueLine {
  font-size: 13px;
  color: var(--ttl-ink);
}

.ttl-ContinueMotto {
  margin-top: 4px;
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-style: italic;
  font-size: 15px;
  color: var(--ttl-dim);
}

.ttl-Nav {
  width: 100%;
  display: flex;
  flex-direction: column;
  animation: ttl-rise 0.9s 0.42s cubic-bezier(0.2, 0.7, 0.2, 1) both;
}

/* The rest: engraved lines on a card, not boxes */
.ttl-Item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-height: 48px;
  justify-content: center;
  padding: 8px 12px;
  border: 0;
  border-top: 1px solid rgba(214, 169, 60, 0.18);
  background: transparent;
  color: var(--ttl-ink);
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-weight: 700;
  font-size: 21px;
  cursor: pointer;
  transition: color 0.15s ease, background-color 0.15s ease, letter-spacing 0.25s ease;
}

.ttl-Nav .ttl-Item:last-child {
  border-bottom: 1px solid rgba(214, 169, 60, 0.18);
}

.ttl-Item small {
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: 12px;
  color: var(--ttl-dim);
}

.ttl-Item:hover {
  color: var(--ttl-gold-hi);
  background: radial-gradient(ellipse at center, rgba(214, 169, 60, 0.14), transparent 70%);
  letter-spacing: 0.03em;
}

.ttl-Continue:focus-visible,
.ttl-Item:focus-visible {
  outline: 2px solid var(--ttl-gold-hi);
  outline-offset: 3px;
}

.ttl-Confirm {
  padding: 14px 16px;
  border: 1px solid rgba(214, 169, 60, 0.3);
  border-radius: 4px;
  background: rgba(12, 7, 8, 0.55);
  font-size: 14px;
  line-height: 1.5;
}

.ttl-Confirm p {
  margin: 0;
}

/* The scenarios as the menu's own gilt-edged cards */
.ttl-Page :deep(.scn-ScenarioPicker) {
  gap: 10px;
}

.ttl-Page :deep(.scn-PickerGroupTitle) {
  width: 100%;
  margin-bottom: 4px;
  padding: 0;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--ttl-gold);
}

.ttl-Page :deep(.scn-ScenarioOption) {
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid rgba(214, 169, 60, 0.3);
  border-radius: 4px;
  background: rgba(12, 7, 8, 0.55);
  color: var(--ttl-ink);
  transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.ttl-Page :deep(.scn-ScenarioOption:hover) {
  border-color: rgba(214, 169, 60, 0.6);
}

.ttl-Page :deep(.scn-ScenarioOption-chosen) {
  border-color: var(--ttl-gold);
  outline: 1px solid rgba(214, 169, 60, 0.35);
  outline-offset: 3px;
  background: linear-gradient(180deg, rgba(214, 169, 60, 0.16), rgba(214, 169, 60, 0.05)), rgba(12, 7, 8, 0.6);
  box-shadow: 0 0 24px rgba(214, 169, 60, 0.18);
}

.ttl-Page :deep(.scn-ScenarioOption input) {
  accent-color: var(--ttl-gold);
  margin-top: 6px;
}

.ttl-Page :deep(.scn-ScenarioOption strong) {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 22px;
  line-height: 1.15;
  color: var(--ttl-gold-hi);
}

.ttl-Page :deep(.scn-ScenarioOption .scn-AutoLine) {
  font-size: 14px;
  line-height: 1.45;
  color: var(--ttl-ink);
}

.ttl-Page :deep(.scn-ScenarioOption .scn-StatHint) {
  font-size: 12px;
  line-height: 1.4;
  color: var(--ttl-dim);
}

.ttl-Page :deep(.scn-ScenarioOption input:focus-visible) {
  outline: 2px solid var(--ttl-gold-hi);
  outline-offset: 3px;
}

.ttl-ConfirmActions {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.ttl-ConfirmActions .ttl-Item {
  flex: 1;
  border: 1px solid rgba(214, 169, 60, 0.35);
  border-radius: 4px;
  font-size: 18px;
}

.ttl-Item-gilt {
  color: #240910;
  background: linear-gradient(180deg, var(--ttl-gold-hi), var(--ttl-gold));
  border-color: var(--ttl-gold) !important;
}

.ttl-Item-gilt:hover {
  color: #240910;
  background: linear-gradient(180deg, #fff3c4, var(--ttl-gold-hi));
}

.ttl-Item-danger {
  color: #ffb4a8;
  border-color: rgba(255, 140, 120, 0.5) !important;
}

.ttl-Foot {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: rgba(185, 171, 140, 0.6);
  animation: ttl-fade 1.2s 0.7s both;
}

.ttl-Rain {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.ttl-Coin {
  position: absolute;
  top: -40px;
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-weight: 700;
  color: var(--ttl-gold);
  animation: ttl-fall linear infinite;
}

/* A compact heading over the menu's pages */
.ttl-Head-compact .ttl-TitleBig {
  font-size: 40px;
}

.ttl-Head-compact .ttl-TitleSmall {
  font-size: 11px;
}

.ttl-Page {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
  text-align: left;
  animation: ttl-rise 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) both;
}

.ttl-PageTitle {
  margin: 0;
  text-align: center;
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-weight: 700;
  font-size: 30px;
  color: var(--ttl-gold-hi);
}

.ttl-HowPage {
  padding: 16px 18px;
  border: 1px solid rgba(214, 169, 60, 0.3);
  border-radius: 4px;
  background: rgba(12, 7, 8, 0.55);
  font-size: 14px;
  line-height: 1.55;
}

.ttl-HowPage h3 {
  margin: 2px 0 8px;
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-weight: 700;
  font-size: 23px;
  line-height: 1.15;
  color: var(--ttl-gold-hi);
}

.ttl-HowPage p {
  margin: 0 0 8px;
}

.ttl-HowPage p:last-child {
  margin-bottom: 0;
}

.ttl-PageKicker {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--ttl-gold);
}

.ttl-Tip {
  padding-left: 10px;
  border-left: 2px solid var(--ttl-gold);
  color: var(--ttl-dim);
}

.ttl-Setting {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  border: 1px solid rgba(214, 169, 60, 0.3);
  border-radius: 4px;
  background: rgba(12, 7, 8, 0.55);
}

.ttl-Setting strong {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 21px;
  color: var(--ttl-gold-hi);
}

.ttl-Setting p {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--ttl-dim);
}

.ttl-Toggle {
  flex: none;
  min-width: 64px;
  min-height: 44px;
  border: 1px solid rgba(214, 169, 60, 0.5);
  border-radius: 999px;
  background: transparent;
  color: var(--ttl-dim);
  font: inherit;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}

.ttl-Toggle[aria-pressed='true'] {
  background: var(--ttl-gold);
  border-color: var(--ttl-gold);
  color: #240910;
}

.ttl-Saves {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ttl-Save {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid rgba(214, 169, 60, 0.3);
  border-radius: 4px;
  background: rgba(12, 7, 8, 0.55);
  text-align: left;
}

.ttl-Save-active {
  border-color: var(--ttl-gold);
  box-shadow: 0 0 0 1px rgba(214, 169, 60, 0.35) inset;
}

.ttl-SaveText {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.ttl-SaveText strong {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 21px;
  color: var(--ttl-gold-hi);
}

.ttl-SaveText span,
.ttl-SaveNote {
  font-size: 13px;
  color: var(--ttl-dim);
}

.ttl-SaveActions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ttl-SaveActions .ttl-Toggle {
  padding: 0 14px;
  font-size: 12px;
}

.ttl-SaveBadge {
  align-self: center;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ttl-gold);
}

.ttl-Toggle-on {
  background: var(--ttl-gold);
  border-color: var(--ttl-gold);
  color: #240910;
}

.ttl-Toggle-danger {
  border-color: #c0504d;
  color: #f2b8b5;
}

.ttl-Upload {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  font-size: 12px;
}

.ttl-Upload input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.ttl-Toggle-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.ttl-SaveError {
  color: #f2b8b5 !important;
}

.ttl-Toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ttl-Select {
  flex: none;
  max-width: 48%;
  min-height: 44px;
  padding: 0 10px;
  border: 1px solid rgba(214, 169, 60, 0.5);
  border-radius: 4px;
  background: #1a0b0e;
  color: var(--ttl-ink);
  font: inherit;
  font-size: 13px;
}

.ttl-Setting-stack {
  flex-direction: column;
  align-items: stretch;
}

.ttl-Setting-stack .ttl-Select {
  max-width: none;
}

.ttl-Back {
  border: 1px solid rgba(214, 169, 60, 0.35);
  border-radius: 4px;
}

.ttl-Toggle:focus-visible,
.ttl-Select:focus-visible {
  outline: 2px solid var(--ttl-gold-hi);
  outline-offset: 3px;
}

@keyframes ttl-rise {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes ttl-fade {
  from {
    opacity: 0;
  }
}

@keyframes ttl-sheen {
  0%,
  100% {
    background-position: 100% 0;
  }
  50% {
    background-position: 0% 0;
  }
}

@keyframes ttl-fall {
  from {
    transform: translateY(0) rotate(-15deg);
  }
  to {
    transform: translateY(calc(100vh + 80px)) rotate(25deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ttl-Screen *,
  .ttl-Screen *::before {
    animation: none !important;
    transition: none !important;
  }

  .ttl-Coin {
    display: none;
  }
}
</style>
