<template>
  <section class="scn-Desk" aria-label="City Trading Desk">
    <div class="scn-DeskTopBar">
      <div class="scn-DeskTitleRow">
        <span class="scn-DeskLiveDot"></span>
        <span class="scn-DeskBrand">CITY TRADING DESK</span>
        <span class="scn-DeskSub">
          FLOW {{ formatCurrency(latestRealised) }}/s · PASSIVE {{ formatCurrency(store.moneyPerSecond) }}/s
        </span>
      </div>
      <button
        type="button"
        class="scn-DeskToggle"
        data-testid="toggle-trading-desk"
        @click="store.toggleTradingDesk()"
      >
        {{ store.tradingDeskCollapsed ? '[ + Expand ]' : '[ − Collapse ]' }}
      </button>
    </div>

    <div v-if="!store.tradingDeskCollapsed" class="scn-DeskBody">
      <div class="scn-DeskMonitors">
        <!-- Monitor 1: 1s Rolling Realised Cashflow -->
        <div class="scn-DeskMonitor">
          <div class="scn-MonitorHeader">
            <div>
              <span class="scn-TickerSym">LON:FLOW</span>
              <span class="scn-MonitorHint">1s Rolling Cashflow (60s)</span>
            </div>
            <div class="scn-MonitorQuote">
              <span class="scn-QuoteVal">{{ formatCurrency(inspectedFlowSample.realisedPerSec) }}/s</span>
              <span
                class="scn-DeltaBadge"
                :class="flowDeltaPct >= 0 ? 'scn-DeltaBadge-up' : 'scn-DeltaBadge-down'"
              >
                {{ flowDeltaPct >= 0 ? '▲' : '▼' }} {{ Math.abs(flowDeltaPct).toFixed(1) }}%
              </span>
            </div>
          </div>

          <!-- Realised money stacked by where it came from, the line along the top.
               Hover, or press on a phone, for a moment's breakdown. -->
          <div
            ref="flowChart"
            class="scn-ChartWrap"
            @pointermove="onFlowPointer"
            @pointerdown="onFlowPress"
            @pointerleave="onFlowLeave"
          >
            <svg class="scn-ChartSvg" :viewBox="`0 0 ${SVG_W} ${SVG_H}`" preserveAspectRatio="none" data-testid="flow-chart">
              <defs>
                <pattern id="ic-favour-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="6" height="6" style="fill: var(--color-gold)" />
                  <rect width="2.2" height="6" style="fill: rgba(255, 255, 255, 0.55)" />
                </pattern>
              </defs>

              <line
                v-for="gy in gridYLines"
                :key="`fg-${gy}`"
                x1="0"
                :y1="gy"
                :x2="SVG_W"
                :y2="gy"
                class="scn-GridLine"
              />

              <path
                v-for="band in flowBands"
                :key="band.id"
                :d="band.d"
                class="scn-FlowBand"
                :style="{ fill: band.fill }"
                :data-testid="`flow-band-${band.id}`"
              />
              <path :d="passiveLinePath" fill="none" class="scn-PassiveLine" />
              <path :d="flowLinePath" fill="none" class="scn-FlowLine" />

              <!-- What happened is named in the breakdown: a run of purchases would pile labels up -->
              <line v-for="pin in markerPins" :key="`pin-${pin.ts}`" :x1="pin.x" y1="6" :x2="pin.x" :y2="SVG_H - 4" class="scn-MarkerLine" />

              <line
                v-if="hoverFlowX !== null"
                :x1="hoverFlowX"
                y1="0"
                :x2="hoverFlowX"
                :y2="SVG_H"
                class="scn-Crosshair"
              />
            </svg>
            <div v-if="flowTip" class="scn-FlowTip" :style="flowTip.style" data-testid="flow-tip">
              <b>{{ flowTip.when }} · {{ formatCurrency(flowTip.total) }}/s</b>
              <span v-if="flowTip.marker" class="scn-FlowTipMark">{{ flowTip.marker }}</span>
              <span v-for="row in flowTip.rows" :key="row.id">
                <i class="scn-SectorDot" :class="{ 'scn-Hatch': row.id === 'favours' }" :style="{ backgroundColor: row.color }"></i>
                {{ row.label }} {{ formatCurrency(row.perSec) }}/s
              </span>
            </div>
          </div>

          <div class="scn-AxisFooter">
            <span>Low {{ formatCurrency(flowRange.min) }}/s</span>
            <span class="scn-LegendInline">
              <i class="scn-Swatch scn-Swatch-solid"></i> Realised 1s, by source
              <i class="scn-Swatch scn-Swatch-dashed"></i> Passive floor
            </span>
            <span>High {{ formatCurrency(flowRange.max) }}/s</span>
          </div>
        </div>

        <!-- Monitor 2: 2s Treasury OHLC Candlesticks -->
        <div class="scn-DeskMonitor">
          <div class="scn-MonitorHeader">
            <div>
              <span class="scn-TickerSym">LON:CASH</span>
              <span class="scn-MonitorHint">Treasury OHLC (2s candles)</span>
            </div>
            <div class="scn-MonitorQuote">
              <span class="scn-QuoteSub">
                O {{ formatCurrency(inspectedCandle.open) }} · C {{ formatCurrency(inspectedCandle.close) }}
              </span>
            </div>
          </div>

          <svg
            class="scn-ChartSvg"
            :viewBox="`0 0 ${SVG_W} ${SVG_H}`"
            preserveAspectRatio="none"
            @mousemove="onCandleHover"
            @mouseleave="hoverCandleIdx = null"
          >
            <line
              v-for="gy in gridYLines"
              :key="`cg-${gy}`"
              x1="0"
              :y1="gy"
              :x2="SVG_W"
              :y2="gy"
              class="scn-GridLine"
            />

            <g v-for="bar in candleBars" :key="bar.bucketStart">
              <line
                :x1="bar.cx"
                :y1="bar.highY"
                :x2="bar.cx"
                :y2="bar.lowY"
                :stroke="bar.bullish ? '#22c55e' : '#ef4444'"
                stroke-width="1.5"
              />
              <rect
                :x="bar.x"
                :y="bar.bodyY"
                :width="bar.width"
                :height="bar.bodyH"
                :fill="bar.bullish ? '#22c55e' : '#ef4444'"
                rx="1"
              />
            </g>

            <!-- Where a buyer bought something: hover for what -->
            <g v-for="bar in buyerMarks" :key="`buy-${bar.bucketStart}`" data-testid="desk-buy-mark">
              <title>{{ bar.text }}</title>
              <path :d="`M ${bar.cx - 3} ${bar.y - 7} L ${bar.cx + 3} ${bar.y - 7} L ${bar.cx} ${bar.y - 2} Z`" class="scn-BuyMark" />
            </g>

            <line
              v-if="hoverCandleX !== null"
              :x1="hoverCandleX"
              y1="0"
              :x2="hoverCandleX"
              :y2="SVG_H"
              class="scn-Crosshair"
            />
          </svg>

          <div class="scn-AxisFooter">
            <span>Low {{ formatCurrency(candleRange.min) }}</span>
            <span class="scn-LegendInline">
              <i class="scn-CandleDot scn-CandleDot-up"></i> Accumulating
              <i class="scn-CandleDot scn-CandleDot-down"></i> Capital deployed
            </span>
            <span>High {{ formatCurrency(candleRange.max) }}</span>
          </div>
        </div>
      </div>

      <!-- Bottom Strip: Portfolio Revenue Mix -->
      <div class="scn-SectorStrip">
        <div class="scn-SectorTitle">PORTFOLIO REVENUE MIX</div>
        <div class="scn-SectorBar">
          <div
            v-for="slice in store.sectorSlices"
            :key="slice.id"
            class="scn-SectorSeg"
            :class="{ 'scn-Hatch': slice.id === 'favours' }"
            :style="{ width: `${slice.pct.toFixed(2)}%`, backgroundColor: slice.color }"
            :title="`${slice.label}: ${formatCurrency(slice.perSec)}/s (${slice.pct.toFixed(1)}%)`"
          ></div>
        </div>
        <div class="scn-SectorLegend">
          <span v-for="slice in store.sectorSlices" :key="`leg-${slice.id}`" class="scn-SectorItem">
            <i class="scn-SectorDot" :class="{ 'scn-Hatch': slice.id === 'favours' }" :style="{ backgroundColor: slice.color }"></i>
            {{ slice.label }} <strong>{{ slice.pct.toFixed(1) }}%</strong>
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { BUSINESSES_BY_ID } from '../data/items'
import { sourceColour, sourceOrder } from '../engine/economy'
import { MAX_CANDLES, realisedMix, type CashflowSample, type OhlcCandle } from '../engine/telemetry'
import { useGameStore } from '../stores/game'
import { formatCurrency } from '../utils/format'

const SVG_W = 560
const SVG_H = 112
const PAD_TOP = 12
const PAD_BOT = 10
const PLOT_H = SVG_H - PAD_TOP - PAD_BOT

const gridYLines = [PAD_TOP, Math.round(PAD_TOP + PLOT_H * 0.5), PAD_TOP + PLOT_H]

const store = useGameStore()

const hoverFlowIdx = ref<number | null>(null)
const hoverCandleIdx = ref<number | null>(null)

const flowSamples = computed<CashflowSample[]>(() => {
  const list = store.telemetry.samples
  const livePoint: CashflowSample = {
    ts: store.nowMs,
    realisedPerSec: store.realisedPerSecond,
    passivePerSec: store.moneyPerSecond,
    favourPerSec: list.at(-1)?.favourPerSec,
    mix: realisedMix(store.telemetry, store.nowMs, store.passiveSources)
  }
  return list.length > 0 ? [...list, livePoint] : [livePoint]
})

const latestRealised = computed(() => store.realisedPerSecond)

const inspectedFlowSample = computed<CashflowSample>(() => {
  const pts = flowSamples.value
  if (hoverFlowIdx.value !== null && pts[hoverFlowIdx.value]) {
    return pts[hoverFlowIdx.value]
  }
  return pts[pts.length - 1]
})

const flowDeltaPct = computed(() => {
  const pts = flowSamples.value
  if (pts.length < 2) return 0
  const refIdx = Math.max(0, pts.length - 41) // ~10s ago at 4Hz
  const baseline = Math.max(pts[refIdx].realisedPerSec, pts[refIdx].passivePerSec)
  const nowVal = pts[pts.length - 1].realisedPerSec
  if (baseline <= 0) {
    return nowVal > 0 ? 100 : 0
  }
  return ((nowVal - baseline) / baseline) * 100
})

// From zero, so the stacked bands keep their true sizes
const flowRange = computed(() => {
  let min = Infinity
  let max = 0
  for (const s of flowSamples.value) {
    min = Math.min(min, s.realisedPerSec)
    max = Math.max(max, s.realisedPerSec, s.passivePerSec)
  }
  if (!Number.isFinite(min)) min = 0
  return { min: Math.max(0, min), max: max <= 0 ? 100 : max * 1.08 }
})

function yForFlow(val: number): number {
  const norm = Math.min(1, Math.max(0, val / Math.max(1e-6, flowRange.value.max)))
  return Number((PAD_TOP + PLOT_H * (1 - norm)).toFixed(2))
}

function xForFlow(idx: number, total: number): number {
  if (total <= 1) return SVG_W
  return Number(((idx / (total - 1)) * SVG_W).toFixed(2))
}

const flowLinePath = computed(() => {
  const pts = flowSamples.value
  if (pts.length === 1) {
    const y = yForFlow(pts[0].realisedPerSec)
    return `M 0 ${y} L ${SVG_W} ${y}`
  }
  return pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xForFlow(i, pts.length)} ${yForFlow(p.realisedPerSec)}`)
    .join(' ')
})

// Where the money came from, as bands stacked under the line. The five
// biggest sources over the window get bands of their own; the rest share
// one. Each keeps its colour (economy.ts sourceColour).
const MAX_BANDS = 5

function sourceLabel(id: string): string {
  if (id.startsWith('biz-')) return BUSINESSES_BY_ID[id.slice(4)]?.label ?? 'A business'
  const fixed: Record<string, string> = {
    interns: 'Unpaid Interns',
    allowance: store.allowanceLabel,
    manual: 'Manual Hustle',
    favours: 'Favours',
    windfall: 'Windfalls',
    other: 'Other Ventures'
  }
  return fixed[id] ?? 'Other Ventures'
}

const bandIds = computed<string[]>(() => {
  const totals = new Map<string, number>()
  for (const p of flowSamples.value) {
    for (const [id, v] of Object.entries(p.mix ?? {})) totals.set(id, (totals.get(id) ?? 0) + v)
  }
  const ranked = [...totals.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([id]) => id)
  const kept = ranked.slice(0, MAX_BANDS)
  if (ranked.length > MAX_BANDS && !kept.includes('other')) kept.push('other')
  return kept.sort((a, b) => sourceOrder(a) - sourceOrder(b))
})

// A sample's money by band: anything without a band of its own goes to Other
function bandValues(p: CashflowSample): Record<string, number> {
  const out: Record<string, number> = {}
  const ids = bandIds.value
  for (const [id, v] of Object.entries(p.mix ?? {})) {
    const key = ids.includes(id) ? id : 'other'
    out[key] = (out[key] ?? 0) + v
  }
  return out
}

const flowBands = computed(() => {
  const pts = flowSamples.value
  if (pts.length < 2) return []
  const values = pts.map(bandValues)
  const base = new Array<number>(pts.length).fill(0)
  const bands: Array<{ id: string; d: string; fill: string }> = []
  for (const id of bandIds.value) {
    const lo = base.slice()
    for (let i = 0; i < pts.length; i++) base[i] += values[i][id] ?? 0
    if (base.every((v, i) => v - lo[i] <= 0)) continue
    const top = base.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xForFlow(i, pts.length)} ${yForFlow(v)}`)
    const bottom = lo.map((v, i) => `L ${xForFlow(i, pts.length)} ${yForFlow(v)}`).reverse()
    bands.push({ id, d: `${top.join(' ')} ${bottom.join(' ')} Z`, fill: id === 'favours' ? 'url(#ic-favour-hatch)' : sourceColour(id) })
  }
  return bands
})

const passiveLinePath = computed(() => {
  const pts = flowSamples.value
  if (pts.length === 1) {
    const y = yForFlow(pts[0].passivePerSec)
    return `M 0 ${y} L ${SVG_W} ${y}`
  }
  return pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xForFlow(i, pts.length)} ${yForFlow(p.passivePerSec)}`)
    .join(' ')
})

const markerPins = computed(() => {
  const pts = flowSamples.value
  const pins: Array<{ ts: number; x: number; marker: string }> = []
  pts.forEach((p, idx) => {
    if (p.marker) {
      pins.push({ ts: p.ts, x: xForFlow(idx, pts.length), marker: p.marker })
    }
  })
  return pins.slice(-8)
})

const hoverFlowX = computed(() => {
  if (hoverFlowIdx.value === null) return null
  return xForFlow(hoverFlowIdx.value, flowSamples.value.length)
})

// Hover with a mouse; on a touch screen a press holds the breakdown until a
// tap elsewhere
const flowChart = ref<HTMLElement | null>(null)
const flowPinned = ref(false)

function flowIndexAt(clientX: number): number | null {
  const box = flowChart.value?.getBoundingClientRect()
  if (!box || box.width <= 0) return null
  const ratio = Math.min(1, Math.max(0, (clientX - box.left) / box.width))
  return Math.round(ratio * (flowSamples.value.length - 1))
}

function onFlowPointer(ev: PointerEvent): void {
  if (ev.pointerType === 'mouse' || flowPinned.value) hoverFlowIdx.value = flowIndexAt(ev.clientX)
}

function onFlowPress(ev: PointerEvent): void {
  if (ev.pointerType === 'mouse') return
  flowPinned.value = true
  hoverFlowIdx.value = flowIndexAt(ev.clientX)
}

function onFlowLeave(ev: PointerEvent): void {
  if (ev.pointerType === 'mouse') hoverFlowIdx.value = null
}

function unpinFlow(ev: PointerEvent): void {
  if (flowPinned.value && !flowChart.value?.contains(ev.target as Node)) {
    flowPinned.value = false
    hoverFlowIdx.value = null
  }
}
onMounted(() => document.addEventListener('pointerdown', unpinFlow))
onUnmounted(() => document.removeEventListener('pointerdown', unpinFlow))

// The breakdown for the moment under the pointer, top band first, beside it
const flowTip = computed(() => {
  const idx = hoverFlowIdx.value
  const p = idx !== null ? flowSamples.value[idx] : null
  if (idx === null || !p) return null
  const values = bandValues(p)
  const rows = [...bandIds.value]
    .reverse()
    .filter((id) => (values[id] ?? 0) > 0)
    .map((id) => ({ id, label: sourceLabel(id), perSec: values[id], color: sourceColour(id) }))
  const secondsAgo = Math.max(0, Math.round((store.nowMs - p.ts) / 1000))
  // A marker within half a second either side, so it's easy to land on
  const pts = flowSamples.value
  let marker: string | null = null
  for (let i = Math.max(0, idx - 2); i <= Math.min(pts.length - 1, idx + 2); i++) if (pts[i].marker) marker = pts[i].marker ?? null
  const ratio = idx / Math.max(1, flowSamples.value.length - 1)
  return {
    when: secondsAgo === 0 ? 'Now' : `${secondsAgo}s ago`,
    marker,
    total: p.realisedPerSec,
    rows,
    style: ratio < 0.5 ? { left: `calc(${(ratio * 100).toFixed(1)}% + 10px)` } : { right: `calc(${((1 - ratio) * 100).toFixed(1)}% + 10px)` }
  }
})

// OHLC Candlestick computations
// Copies: the store changes the newest candle in place and only tells Vue
// that something changed, so a fresh list is what makes the chart redraw
const candles = computed<OhlcCandle[]>(() => store.telemetry.candles.map((c) => ({ ...c })))

const inspectedCandle = computed<OhlcCandle>(() => {
  const list = candles.value
  if (hoverCandleIdx.value !== null && list[hoverCandleIdx.value]) {
    return list[hoverCandleIdx.value]
  }
  return (
    list[list.length - 1] ?? {
      bucketStart: 0,
      open: store.money,
      high: store.money,
      low: store.money,
      close: store.money
    }
  )
})

const candleRange = computed(() => {
  let min = Infinity
  let max = 0
  for (const c of candles.value) {
    min = Math.min(min, c.low)
    max = Math.max(max, c.high)
  }
  if (!Number.isFinite(min)) min = 0
  const pad = Math.max(10, (max - min) * 0.08)
  const floor = Math.max(0, min - pad)
  const ceil = max <= floor ? floor + 100 : max + pad
  return { min: floor, max: ceil }
})


function yForCandle(val: number): number {
  const { min, max } = candleRange.value
  const span = Math.max(1e-6, max - min)
  const norm = Math.min(1, Math.max(0, (val - min) / span))
  return Number((PAD_TOP + PLOT_H * (1 - norm)).toFixed(2))
}

// Candles where a buyer bought something, marked above their high
const buyerMarks = computed(() =>
  candleBars.value.flatMap((bar, i) => {
    const buys = candles.value[i]?.buys
    return buys && buys.length > 0 ? [{ bucketStart: bar.bucketStart, cx: bar.cx, y: bar.highY, text: buys.join('\n') }] : []
  })
)

const candleBars = computed(() => {
  const list = candles.value
  const slotCount = Math.max(MAX_CANDLES, list.length)
  const slotW = SVG_W / slotCount
  const bodyW = Math.max(4, Math.floor(slotW * 0.64))
  const offsetSlots = slotCount - list.length

  return list.map((c, idx) => {
    const slotX = (offsetSlots + idx) * slotW
    const cx = Number((slotX + slotW * 0.5).toFixed(2))
    const openY = yForCandle(c.open)
    const closeY = yForCandle(c.close)
    const highY = yForCandle(c.high)
    const lowY = yForCandle(c.low)
    const bullish = c.close >= c.open
    const bodyTop = Math.min(openY, closeY)
    const bodyH = Math.max(2, Math.abs(closeY - openY))
    return {
      bucketStart: c.bucketStart,
      x: Number((cx - bodyW / 2).toFixed(2)),
      cx,
      width: bodyW,
      bodyY: bodyTop,
      bodyH,
      highY,
      lowY,
      bullish
    }
  })
})

const hoverCandleX = computed(() => {
  if (hoverCandleIdx.value === null || !candleBars.value[hoverCandleIdx.value]) return null
  return candleBars.value[hoverCandleIdx.value].cx
})

function onCandleHover(ev: MouseEvent): void {
  const target = ev.currentTarget as SVGSVGElement | null
  if (!target || candleBars.value.length === 0) return
  const rect = target.getBoundingClientRect()
  if (rect.width <= 0) return
  const svgX = ((ev.clientX - rect.left) / rect.width) * SVG_W
  let bestIdx = 0
  let bestDist = Infinity
  candleBars.value.forEach((b, idx) => {
    const d = Math.abs(b.cx - svgX)
    if (d < bestDist) {
      bestDist = d
      bestIdx = idx
    }
  })
  hoverCandleIdx.value = bestIdx
}
</script>
