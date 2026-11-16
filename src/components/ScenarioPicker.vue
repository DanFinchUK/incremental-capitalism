<template>
  <fieldset class="scn-ScenarioPicker" data-testid="scenario-picker">
    <legend class="scn-PickerGroupTitle">How the new family plays</legend>
    <label
      v-for="s in SCENARIOS"
      :key="s.id"
      class="scn-ScenarioOption"
      :class="{ 'scn-ScenarioOption-chosen': modelValue === s.id }"
      :data-testid="`scenario-${s.id}`"
    >
      <input type="radio" name="scenario" :value="s.id" :checked="modelValue === s.id" @change="emit('update:modelValue', s.id)">
      <span>
        <strong>{{ s.name }}</strong>
        <span class="scn-AutoLine">{{ s.blurb }}</span>
        <span class="scn-StatHint">{{ s.rules }}</span>
        <span v-if="bestOf(s.id)" class="scn-StatHint">Best: {{ bestOf(s.id) }}</span>
      </span>
    </label>
  </fieldset>
</template>

<script setup lang="ts">
// Choosing the rule a new dynasty plays under, once any family has made Duke
import { SCENARIOS, type ScenarioId } from '../data/scenarios'
import { bestDynasty } from '../engine/hall'
import { useGameStore } from '../stores/game'
import { formatDuration, pluralSurname } from '../utils/format'

defineProps<{ modelValue: ScenarioId }>()
const emit = defineEmits<{ (e: 'update:modelValue', id: ScenarioId): void }>()
const store = useGameStore()

function bestOf(id: ScenarioId): string | null {
  const best = bestDynasty(store.hall, id)
  return best ? `the ${pluralSurname(best.surname)}, ${formatDuration(best.activeMs / 1000)}` : null
}
</script>
