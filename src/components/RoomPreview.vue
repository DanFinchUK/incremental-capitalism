<template>
  <div
    class="rm-Room"
    :class="[`rm-Room-${room.ornament}`, `rm-Room-${scheme}`, { 'rm-Room-serif': room.displayFont === 'serif' }]"
    :style="roomStyle(room, scheme)"
    :data-testid="`room-${room.id}-${scheme}`"
  >
    <div class="rm-Scheme">{{ scheme === 'light' ? 'Light' : 'Dark' }}</div>

    <div class="rm-Hero">
      <svg v-for="c in corners" :key="c" class="rm-Corner" :class="`rm-Corner-${c}`" viewBox="0 0 40 40" aria-hidden="true">
        <path d="M3 37 V14 Q3 3 14 3 H37" />
        <path d="M9 37 V17 Q9 9 17 9 H37" />
        <circle cx="14" cy="14" r="2.6" />
        <path d="M3 24 Q9 22 9 30 M24 3 Q22 9 30 9" />
      </svg>
      <div class="rm-HeroTop">
        <div>
          <div class="rm-Label">Class {{ level }}</div>
          <h4 class="rm-ClassName">{{ classLabel }}</h4>
        </div>
        <div class="rm-NetWorth">
          <div class="rm-Label">Net worth</div>
          <div class="rm-Value">{{ netWorth }}</div>
        </div>
      </div>
      <div class="rm-Track"><div class="rm-Fill" /></div>
      <button type="button" class="rm-GetPaid">Get paid</button>
    </div>

    <div class="rm-Card">
      <img v-if="image" :src="image" alt="" class="rm-Img" loading="lazy">
      <div class="rm-CardBody">
        <h5 class="rm-CardTitle">{{ itemLabel }}</h5>
        <div class="rm-Pills">
          <span class="rm-Pill">Owned 12</span>
          <span class="rm-Pill rm-Pill-rare">Rare</span>
          <span class="rm-Pill rm-Pill-legendary">Legendary</span>
        </div>
        <p class="rm-Muted">Next: {{ nextCost }} · <span class="rm-Synergy">+25% with a sister firm</span></p>
        <div class="rm-Buttons">
          <button type="button" class="rm-Btn">Buy 1</button>
          <button type="button" class="rm-Btn rm-Btn-outline">Max</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { roomStyle, type RoomDef } from '../data/rooms'

const props = defineProps<{
  room: RoomDef
  scheme: 'light' | 'dark'
  level: number
  classLabel: string
  netWorth: string
  itemLabel: string
  nextCost: string
  image: string | null
}>()

const corners = computed(() => (props.room.ornament === 'gilt' ? ['tl', 'tr', 'bl', 'br'] : []))
</script>

<style>
/* Textures, as faint tiles. Colours are fixed here; opacity keeps them quiet in both schemes */
.rm-Room {
  --rm-leather: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .2 0 0 0 0 .1 0 0 0 0 0 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.14'/%3E%3C/svg%3E");
  --rm-damask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'%3E%3Cg fill='none' stroke='%23b08a2e' stroke-opacity='.16'%3E%3Cpath d='M18 2 C24 10 24 14 18 18 C12 14 12 10 18 2Z M18 34 C24 26 24 22 18 18 C12 22 12 26 18 34Z M2 18 C10 12 14 12 18 18 C14 24 10 24 2 18Z M34 18 C26 12 22 12 18 18 C22 24 26 24 34 18Z'/%3E%3C/g%3E%3C/svg%3E");
  --rm-scales: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='12' viewBox='0 0 24 12'%3E%3Cg fill='none' stroke='%233fbf8a' stroke-opacity='.16'%3E%3Cpath d='M0 12 A12 12 0 0 1 24 12 M-12 0 A12 12 0 0 1 12 0 M12 0 A12 12 0 0 1 36 0'/%3E%3C/g%3E%3C/svg%3E");

  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  background: var(--color-bg);
  color: var(--color-body);
  border-radius: 6px;
  font-size: 14px;
  min-width: 0;
}

.rm-Scheme {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
}

.rm-Hero {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}

.rm-HeroTop {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.rm-Label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-muted);
}

.rm-ClassName {
  margin: 2px 0 0;
  font-family: var(--font-display);
  font-size: 18px;
  color: var(--color-accent);
}

.rm-NetWorth {
  text-align: right;
}

.rm-Value {
  font-size: 18px;
  font-weight: 700;
}

.rm-Track {
  height: 8px;
  background: var(--color-track);
  border-radius: 999px;
  overflow: hidden;
}

.rm-Fill {
  width: 62%;
  height: 100%;
  background: var(--color-accent);
}

.rm-GetPaid {
  padding: 10px;
  background: var(--color-accent);
  color: var(--color-accent-fg);
  border: 0;
  border-radius: var(--radius);
  font: inherit;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}

.rm-GetPaid:hover {
  background: var(--color-accent-hover);
}

.rm-Card {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}

.rm-Img {
  width: 76px;
  height: 76px;
  flex: none;
  object-fit: cover;
  border-radius: var(--radius);
  background: var(--color-card-subtle);
}

.rm-CardBody {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.rm-CardTitle {
  margin: 0;
  font-family: var(--font-display);
  font-size: 16px;
}

.rm-Pills {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.rm-Pill {
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--color-pip-bg);
  color: var(--color-pip-fg);
  font-size: 12px;
  font-weight: 600;
}

.rm-Pill-rare {
  background: var(--color-perk-pill-bg);
  color: var(--color-perk-pill-fg);
}

.rm-Pill-legendary {
  background: var(--color-gold-bg);
  color: var(--color-gold-fg);
}

.rm-Muted {
  margin: 0;
  color: var(--color-muted);
  font-size: 13px;
}

.rm-Synergy {
  color: var(--color-synergy);
}

.rm-Buttons {
  display: flex;
  gap: 6px;
}

.rm-Btn {
  padding: 5px 12px;
  background: var(--color-btn-bg);
  color: var(--color-btn-fg);
  border: 1px solid var(--color-strong-line);
  border-radius: var(--radius);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
}

.rm-Btn:hover {
  background: var(--color-btn-hover);
}

.rm-Btn-outline {
  background: var(--color-btn-outline-bg);
  color: var(--color-btn-outline-fg);
}

.rm-Btn-outline:hover {
  background: var(--color-btn-outline-hover);
}

/* Serif rooms: the display face goes bigger, since Cormorant runs small */
.rm-Room-serif .rm-ClassName {
  font-size: 23px;
  font-weight: 700;
}

.rm-Room-serif .rm-CardTitle {
  font-size: 19px;
  font-weight: 700;
}

/* Saloon bar: brass rules */
.rm-Room-brass .rm-Hero,
.rm-Room-brass .rm-Card {
  border-color: var(--color-gold);
}

.rm-Room-brass .rm-Hero {
  border-width: 1px 1px 3px;
}

/* Home Counties: a double rule under the class name */
.rm-Room-ruled .rm-ClassName {
  padding-bottom: 4px;
  border-bottom: 3px double var(--color-strong-line);
}

/* Smoking lounge: leather grain and stitching just inside the edge */
.rm-Room-stitched .rm-Hero,
.rm-Room-stitched .rm-Card {
  background-image: var(--rm-leather);
}

.rm-Room-stitched .rm-Hero::after,
.rm-Room-stitched .rm-Card {
  position: relative;
}

.rm-Room-stitched .rm-Hero::after,
.rm-Room-stitched .rm-Card::after {
  content: '';
  position: absolute;
  inset: 4px;
  border: 1px dashed var(--color-gold);
  border-radius: calc(var(--radius) - 2px);
  opacity: 0.55;
  pointer-events: none;
}

/* Alpine chalet: nothing added, more air, quiet capitals */
.rm-Room-clean .rm-Hero {
  padding: 18px;
  border-color: var(--color-border-subtle);
}

.rm-Room-clean .rm-ClassName {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.rm-Room-clean .rm-Card {
  border-color: var(--color-border-subtle);
}

/* State rooms: damask, a gilt double frame and corner flourishes */
.rm-Room-gilt .rm-Hero {
  padding: 22px;
  background-image: var(--rm-damask);
  border: 3px double var(--color-gold);
  outline: 1px solid var(--color-gold);
  outline-offset: 3px;
  margin: 4px;
}

.rm-Room-gilt .rm-Card {
  border-color: var(--color-gold);
}

.rm-Corner {
  position: absolute;
  width: 28px;
  height: 28px;
  fill: none;
  stroke: var(--color-gold);
  stroke-width: 1.6;
  pointer-events: none;
}

.rm-Corner circle {
  fill: var(--color-gold);
  stroke: none;
}

.rm-Corner-tl { top: 2px; left: 2px; }
.rm-Corner-tr { top: 2px; right: 2px; transform: scaleX(-1); }
.rm-Corner-bl { bottom: 2px; left: 2px; transform: scaleY(-1); }
.rm-Corner-br { bottom: 2px; right: 2px; transform: scale(-1, -1); }

/* The Vault: scales under everything, gold hairlines */
.rm-Room-scaled {
  background-image: var(--rm-scales);
}

.rm-Room-scaled .rm-Hero {
  border-color: var(--color-gold);
  box-shadow: inset 0 0 0 1px var(--color-border);
}

.rm-Room-scaled .rm-Card {
  border-top: 2px solid var(--color-gold);
}
</style>
