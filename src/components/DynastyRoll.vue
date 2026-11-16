<template>
  <div class="scn-Roll" data-testid="dynasty-roll">
    <section v-for="(line, i) in lines" :key="i" class="scn-RollLine">
      <div class="scn-RollLineHead">
        <h3>{{ line.rank }}</h3>
        <span>{{ genRange(line) }} · {{ formatDuration(line.activeMs / 1000) }}</span>
      </div>
      <div v-for="p in line.people" :key="p.record.generation" class="scn-RollPerson" data-testid="roll-person">
        <span class="scn-RollGen">{{ p.record.generation }}</span>
        <div class="scn-RollWho">
          <strong>{{ p.record.name }}</strong>
          <span v-if="p.became !== null" class="scn-RollBecame" :class="{ 'scn-RollBecame-duke': p.became >= DUKE_TITLES }">
            Became {{ peerageRank(p.became) }}
          </span>
        </div>
        <span class="scn-RollStats">Gate {{ p.record.deepestGate }} · {{ formatDuration(p.record.activeMs / 1000) }}</span>
        <span class="scn-RollTraits">{{ traits(p.record) }}</span>
        <div v-if="staff(p.record).length > 0" class="scn-RollStaff">
          <span v-for="(s, j) in staff(p.record)" :key="j" :class="{ 'scn-RollPA': s.pa }">{{ s.name }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// Everyone in a dynasty, line by line under the rank each line held. Used by
// the finale and the Hall of Dynasties.
import { computed } from 'vue'
import { INHERITED_BY_ID, TRAITS_BY_ID } from '../data/heirs'
import type { GenerationRecord } from '../engine/family'
import { rollLines, type RollLine } from '../engine/hall'
import { DUKE_TITLES, peerageRank } from '../engine/peerage'
import { formatDuration } from '../utils/format'

const props = defineProps<{ roll: ReadonlyArray<GenerationRecord> }>()
const lines = computed(() => rollLines(props.roll))

function genRange(line: RollLine): string {
  const first = line.people[0].record.generation
  const last = line.people[line.people.length - 1].record.generation
  return first === last ? `Generation ${first}` : `Generations ${first} to ${last}`
}

function traits(r: GenerationRecord): string {
  const names = [r.traitId ? TRAITS_BY_ID[r.traitId]?.name : null, r.inheritId ? INHERITED_BY_ID[r.inheritId]?.name : null]
  const shown = names.filter((n): n is string => !!n)
  return shown.length > 0 ? shown.join(' · ') : 'The founder'
}

// PAs as they were styled, honours and all, then the rest of the office
function staff(r: GenerationRecord): Array<{ name: string; pa: boolean }> {
  const pas = r.pas ?? []
  return [...pas.map((name) => ({ name, pa: true })), ...r.advisors.slice(pas.length).map((name) => ({ name, pa: false }))]
}
</script>
