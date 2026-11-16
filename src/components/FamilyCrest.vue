<template>
  <svg
    class="crest"
    :viewBox="viewBox"
    role="img"
    :aria-label="`Arms of the ${surname} family, motto: ${arms.motto}`"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <clipPath :id="`${uid}-shield`"><path :d="SHIELD" /></clipPath>
      <linearGradient :id="`${uid}-gold`" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f6dd8f" />
        <stop offset="0.5" stop-color="#d6a93c" />
        <stop offset="1" stop-color="#8a6416" />
      </linearGradient>
      <linearGradient :id="`${uid}-sheen`" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity="0.28" />
        <stop offset="0.45" stop-color="#fff" stop-opacity="0" />
      </linearGradient>
      <path :id="`${uid}-motto`" d="M14 171 Q70 182 126 171" />
    </defs>

    <!-- Coronet: none for commoners, then one per rank -->
    <g v-if="rank > 0" class="crest-Coronet" :fill="`url(#${uid}-gold)`" stroke="#5a3f0c" stroke-width="0.8">
      <template v-if="rank === 1">
        <circle v-for="x in [44, 61, 79, 96]" :key="x" :cx="x" cy="22" r="4.5" fill="#efe9dc" />
      </template>
      <template v-else-if="rank === 2">
        <circle v-for="x in [42, 51.5, 61, 70, 79, 88.5, 98]" :key="x" :cx="x" cy="23" r="3.6" fill="#efe9dc" />
      </template>
      <template v-else-if="rank === 3">
        <g v-for="x in [42, 56, 70, 84, 98]" :key="x">
          <line :x1="x" y1="27" :x2="x" y2="10" stroke="#d6a93c" stroke-width="2.2" />
          <circle :cx="x" cy="9" r="3.6" fill="#efe9dc" />
        </g>
        <path v-for="x in [49, 63, 77, 91]" :key="`l${x}`" :d="leaf(x, 0.55)" />
      </template>
      <template v-else-if="rank === 4">
        <path v-for="x in [42, 70, 98]" :key="x" :d="leaf(x, 1)" />
        <g v-for="x in [56, 84]" :key="`p${x}`">
          <line :x1="x" y1="27" :x2="x" y2="18" stroke="#d6a93c" stroke-width="2" />
          <circle :cx="x" cy="16" r="3.4" fill="#efe9dc" />
        </g>
      </template>
      <template v-else>
        <path v-for="x in [42, 56, 70, 84, 98]" :key="x" :d="strawberryLeaf(x)" />
      </template>
      <rect x="36" y="26" width="68" height="11" rx="2" />
      <circle v-for="(x, i) in [46, 58, 70, 82, 94]" :key="`j${x}`" :cx="x" cy="31.5" r="2.2" :fill="i % 2 ? '#1d3f78' : '#8e1b24'" stroke="none" />
    </g>

    <!-- The shield -->
    <g :clip-path="`url(#${uid}-shield)`">
      <rect x="0" y="0" width="140" height="190" :fill="arms.colour" />
      <rect v-if="arms.division === 'pale'" x="70" y="0" width="70" height="190" :fill="arms.metal" />
      <rect v-if="arms.division === 'fess'" x="0" y="95" width="140" height="95" :fill="arms.metal" />
      <polygon v-if="arms.division === 'bend'" points="20,42 120,42 120,152" :fill="arms.metal" />
      <polygon v-if="arms.division === 'chevron'" points="14,128 70,80 126,128 126,146 70,98 14,146" :fill="arms.metal" />
      <template v-if="arms.division === 'quarterly'">
        <rect x="70" y="0" width="70" height="95" :fill="arms.metal" />
        <rect x="0" y="95" width="70" height="95" :fill="arms.metal" />
      </template>

      <g class="crest-Charge" :fill="chargeFill" :stroke="chargeStroke" stroke-width="2.4" paint-order="stroke" stroke-linejoin="round">
        <template v-if="arms.charge === 'bezants'">
          <g v-for="[cx, cy] in [[53, 80], [87, 80], [70, 110]]" :key="`${cx}`">
            <circle :cx="cx" :cy="cy" r="11" />
            <circle :cx="cx" :cy="cy" r="7" fill="none" :stroke="chargeStroke" stroke-width="0.9" stroke-opacity="0.6" />
          </g>
        </template>
        <text v-else-if="arms.charge === 'pound'" x="70" y="116" text-anchor="middle" font-size="58" font-family="'Cormorant Garamond', Georgia, serif" font-weight="700">£</text>
        <path v-else-if="arms.charge === 'mullet'" :d="star(70, 96, 25, 10)" />
        <path v-else-if="arms.charge === 'crescent'" d="M52 84 A22 22 0 1 0 92 84 A18 18 0 1 1 52 84 Z" />
        <g v-else>
          <circle cx="70" cy="70" r="10" fill="none" :stroke="chargeFill" stroke-width="5" />
          <rect x="67.5" y="79" width="5" height="44" />
          <rect x="72" y="106" width="10" height="5" />
          <rect x="72" y="115" width="7" height="5" />
        </g>
      </g>

      <rect x="0" y="0" width="140" height="190" :fill="`url(#${uid}-sheen)`" />
    </g>
    <path :d="SHIELD" fill="none" :stroke="`url(#${uid}-gold)`" stroke-width="3.5" />

    <!-- The motto, on a scroll -->
    <path d="M6 164 L18 162 L18 178 L6 182 L11 172 Z M134 164 L122 162 L122 178 L134 182 L129 172 Z" fill="#cfc3a6" stroke="#8a6416" stroke-width="0.8" />
    <path d="M18 162 Q70 173 122 162 L122 178 Q70 189 18 178 Z" fill="#efe6d2" stroke="#8a6416" stroke-width="0.9" />
    <text class="crest-Motto" :font-size="mottoSize" fill="#3a0d14" text-anchor="middle">
      <textPath :href="`#${uid}-motto`" startOffset="50%">{{ arms.motto.toUpperCase() }}</textPath>
    </text>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { armsFor } from '../engine/crest'

const props = defineProps<{ surname: string; titles: number }>()

// Ids for the gradients and paths, unique to each crest on the page
const uid = `crest-${Math.random().toString(36).slice(2, 9)}`

const SHIELD = 'M20 42 H120 V96 C120 128 98 142 70 154 C42 142 20 128 20 96 Z'

const arms = computed(() => armsFor(props.surname))
const rank = computed(() => Math.max(0, Math.min(5, Math.floor(props.titles))))
// No coronet, no room left for one
const viewBox = computed(() => (rank.value > 0 ? '0 0 140 192' : '0 36 140 156'))

// Metal on colour: the charge is in the metal, edged in the colour, so it
// stands out on whichever half it lands
const chargeFill = computed(() => arms.value.metal)
// Long mottoes in smaller letters, so they stay on the scroll
const mottoSize = computed(() => Math.min(9.5, 150 / arms.value.motto.length).toFixed(1))
const chargeStroke = computed(() => arms.value.colour)

function leaf(x: number, scale: number): string {
  const h = 16 * scale
  const w = 7 * scale
  return `M${x - w} 27 Q${x - w - 1} ${27 - h * 0.7} ${x} ${27 - h} Q${x + w + 1} ${27 - h * 0.7} ${x + w} 27 Z`
}

function strawberryLeaf(x: number): string {
  return `M${x - 7} 27 C${x - 11} 18 ${x - 7} 14 ${x - 3} 17 C${x - 4} 10 ${x + 4} 10 ${x + 3} 17 C${x + 7} 14 ${x + 11} 18 ${x + 7} 27 Z`
}

function star(cx: number, cy: number, outer: number, inner: number): string {
  const points: string[] = []
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    points.push(`${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`)
  }
  return `M${points.join(' L')} Z`
}
</script>

<style scoped>
.crest {
  display: block;
  overflow: visible;
}

.crest-Motto {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-weight: 700;
  letter-spacing: 0.08em;
}
</style>
