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

          <svg
            class="scn-ChartSvg"
            :viewBox="`0 0 ${SVG_W} ${SVG_H}`"
            preserveAspectRatio="none"
            @mousemove="onFlowHover"
            @mouseleave="hoverFlowIdx = null"
          >
            <defs>
              <linearGradient id="ic-flow-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#a5c956" stop-opacity="0.42" />
                <stop offset="100%" stop-color="#a5c956" stop-opacity="0.02" />
              </linearGradient>
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

            <path :d="flowAreaPath" fill="url(#ic-flow-grad)" />
            <path :d="passiveLinePath" fill="none" class="scn-PassiveLine" />
            <path :d="flowLinePath" fill="none" class="scn-FlowLine" />

            <g v-for="pin in markerPins" :key="`pin-${pin.ts}`">
              <line :x1="pin.x" y1="6" :x2="pin.x" :y2="SVG_H - 4" class="scn-MarkerLine" />
              <text :x="pin.x + 3" y="16" class="scn-MarkerLabel">{{ pin.marker }}</text>
            </g>

            <line
              v-if="hoverFlowX !== null"
              :x1="hoverFlowX"
              y1="0"
              :x2="hoverFlowX"
              :y2="SVG_H"
              class="scn-Crosshair"
            />
          </svg>

          <div class="scn-AxisFooter">
            <span>Low {{ formatCurrency(flowRange.min) }}/s</span>
            <span class="scn-LegendInline">
              <i class="scn-Swatch scn-Swatch-solid"></i> Realised 1s
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
        <div v-if="store.sectorSlices.length === 0" class="scn-SectorEmpty">
          Awaiting active revenue streams: click Get Paid or acquire your first venture.
        </div>
        <template v-else>
          <div class="scn-SectorBar">
            <div
              v-for="slice in store.sectorSlices"
              :key="slice.id"
              class="scn-SectorSeg"
              :style="{ width: `${slice.pct.toFixed(2)}%`, backgroundColor: slice.color }"
              :title="`${slice.label}: ${formatCurrency(slice.perSec)}/s (${slice.pct.toFixed(1)}%)`"
            ></div>
          </div>
          <div class="scn-SectorLegend">
            <span v-for="slice in store.sectorSlices" :key="`leg-${slice.id}`" class="scn-SectorItem">
              <i class="scn-SectorDot" :style="{ backgroundColor: slice.color }"></i>
              {{ slice.label }} <strong>{{ slice.pct.toFixed(1) }}%</strong>
            </span>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { MAX_CANDLES, type CashflowSample, type OhlcCandle } from '../engine/telemetry'
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
    passivePerSec: store.moneyPerSecond
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

const flowRange = computed(() => {
  let min = Infinity
  let max = 0
  for (const s of flowSamples.value) {
    min = Math.min(min, s.realisedPerSec, s.passivePerSec)
    max = Math.max(max, s.realisedPerSec, s.passivePerSec)
  }
  if (!Number.isFinite(min)) min = 0
  const floor = min * 0.9
  const ceil = max <= floor ? floor + 100 : max * 1.08
  return { min: Math.max(0, floor), max: ceil }
})

function yForFlow(val: number): number {
  const { min, max } = flowRange.value
  const span = Math.max(1e-6, max - min)
  const norm = Math.min(1, Math.max(0, (val - min) / span))
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

const flowAreaPath = computed(() => {
  const base = PAD_TOP + PLOT_H
  return `${flowLinePath.value} L ${SVG_W} ${base} L 0 ${base} Z`
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

function onFlowHover(ev: MouseEvent): void {
  const target = ev.currentTarget as SVGSVGElement | null
  if (!target) return
  const rect = target.getBoundingClientRect()
  if (rect.width <= 0) return
  const ratio = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width))
  hoverFlowIdx.value = Math.round(ratio * (flowSamples.value.length - 1))
}

// OHLC Candlestick computations
const candles = computed<OhlcCandle[]>(() => store.telemetry.candles)

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
