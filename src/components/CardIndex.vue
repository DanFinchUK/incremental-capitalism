<template>
  <div class="idx-Page">
    <header class="idx-Header">
      <div>
        <h1 class="idx-Title">Card Index</h1>
        <p class="idx-Lede">Everyone and everything money can buy in Incremental Capitalism, and a few things it can't.</p>
      </div>
      <a class="idx-Back" href="./index.html">Back to the game</a>
    </header>

    <nav class="idx-Nav" aria-label="Sections">
      <a v-for="s in sections" :key="s.id" :href="`#${s.id}`" class="idx-NavLink">
        {{ s.title }} <span class="idx-Count">{{ s.count }}</span>
      </a>
    </nav>

    <label class="idx-Search">
      <span class="idx-SearchLabel">Filter</span>
      <input v-model="query" type="search" placeholder="Name, sector, effect..." data-testid="card-filter">
    </label>

    <section id="jobs" class="idx-Section">
      <h2>Jobs</h2>
      <p class="idx-Rules">Each Job pays per tap of Get paid. Price shown is the first one; each extra costs more by the growth rate.</p>
      <div class="idx-Grid">
        <article v-for="j in jobs" :key="j.id" class="idx-Card">
          <img :src="itemImageUrl('jobs', j.label)" alt="" class="idx-Img" loading="lazy">
          <h3>{{ j.label }}</h3>
          <div class="idx-Pills">
            <span class="idx-Pill">{{ sectorLabel(j.sector) }}</span>
          </div>
          <dl class="idx-Stats">
            <dt>Costs</dt><dd>{{ formatCurrency(j.baseCost) }}</dd>
            <dt>Pays</dt><dd>{{ formatCurrency(j.moneyPerClick) }} a tap</dd>
            <dt>Growth</dt><dd>+{{ growth(j.scaleFactor) }} each</dd>
          </dl>
          <p class="idx-Note">{{ j.synergyNote }}</p>
        </article>
      </div>
      <p v-if="jobs.length === 0" class="idx-Empty">No Jobs match.</p>
    </section>

    <section id="businesses" class="idx-Section">
      <h2>Businesses</h2>
      <p class="idx-Rules">Each Business earns every second. Price shown is the first one.</p>
      <div class="idx-Grid">
        <article v-for="b in businesses" :key="b.id" class="idx-Card">
          <img :src="itemImageUrl('businesses', b.label)" alt="" class="idx-Img" loading="lazy">
          <h3>{{ b.label }}</h3>
          <div class="idx-Pills">
            <span class="idx-Pill">{{ sectorLabel(b.sector) }}</span>
          </div>
          <dl class="idx-Stats">
            <dt>Costs</dt><dd>{{ formatCurrency(b.baseCost) }}</dd>
            <dt>Earns</dt><dd>{{ formatCurrency(b.moneyPerSecond) }}/s</dd>
            <dt>Growth</dt><dd>+{{ growth(b.scaleFactor) }} each</dd>
          </dl>
          <p v-if="SYNERGY_JOB_FOR_BUSINESS[b.id]" class="idx-Note">Boosted by {{ SYNERGY_JOB_FOR_BUSINESS[b.id].label }}</p>
        </article>
      </div>
      <p v-if="businesses.length === 0" class="idx-Empty">No Businesses match.</p>
    </section>

    <section id="advisors" class="idx-Section">
      <h2>Advisors</h2>
      <p class="idx-Rules">Every effect comes as a common, rare and legendary advisor. The hire fee is a share of cash on hand.</p>
      <div v-for="group in advisorGroups" :key="group.family" class="idx-Group">
        <h3 class="idx-GroupTitle">{{ familyLabel(group.family) }}</h3>
        <div class="idx-Grid">
          <article v-for="a in group.advisors" :key="a.id" class="idx-Card" :class="`idx-Card-${a.rarity}`">
            <h3>{{ a.name }}</h3>
            <div class="idx-Pills">
              <span class="idx-Pill" :class="`idx-Pill-${a.rarity}`">{{ RARITY_LABELS[a.rarity] }}</span>
              <span v-for="r in a.roles" :key="r" class="idx-Pill">{{ ROLE_LABELS[r] }}</span>
            </div>
            <p>{{ a.effectText }}</p>
            <p class="idx-Cost">{{ a.costText }}</p>
            <p class="idx-Note">Hire fee: {{ pct(a.hireFeeShare) }} of cash</p>
          </article>
        </div>
      </div>
      <p v-if="advisorGroups.length === 0" class="idx-Empty">No advisors match.</p>
    </section>

    <section id="heirs" class="idx-Section">
      <h2>Heirs</h2>
      <h3 class="idx-GroupTitle">Personal traits</h3>
      <p class="idx-Rules">An heir's own trait lasts their lifetime only.</p>
      <div class="idx-Grid">
        <article v-for="t in heirTraits" :key="t.id" class="idx-Card" :class="`idx-Card-${t.rarity}`">
          <h3>{{ t.name }}</h3>
          <div class="idx-Pills">
            <span class="idx-Pill" :class="`idx-Pill-${t.rarity}`">{{ RARITY_LABELS[t.rarity] }}</span>
          </div>
          <p>{{ t.description }}</p>
        </article>
      </div>
      <h3 class="idx-GroupTitle">Runs in the family</h3>
      <p class="idx-Rules">Passed down the bloodline and stacked with every ancestor's until the family elevates.</p>
      <div class="idx-Grid">
        <article v-for="t in inheritedTraits" :key="t.id" class="idx-Card">
          <h3>{{ t.name }}</h3>
          <p>{{ t.description }}</p>
        </article>
      </div>
      <p v-if="heirTraits.length + inheritedTraits.length === 0" class="idx-Empty">No traits match.</p>
    </section>

    <section id="bosses" class="idx-Section">
      <h2>Bosses</h2>
      <p class="idx-Rules">One guards each class gate. Win to move up a class.</p>
      <div class="idx-Grid idx-Grid-wide">
        <article v-for="b in bosses" :key="b.id" class="idx-Card">
          <h3>{{ b.title }}</h3>
          <div class="idx-Pills">
            <span class="idx-Pill">Gate {{ b.gate }}</span>
            <span class="idx-Pill">{{ SOCIAL_CLASSES[b.gate]?.label }}</span>
            <span class="idx-Pill">{{ formatDuration(b.timeLimitSec) }}</span>
          </div>
          <p class="idx-Flavour">{{ b.blurb }}</p>
          <dl class="idx-Stats">
            <dt>Twist</dt><dd>{{ b.twistText }}</dd>
            <dt>To win</dt><dd>{{ b.conditionText }}</dd>
          </dl>
        </article>
      </div>
      <p v-if="bosses.length === 0" class="idx-Empty">No bosses match.</p>
    </section>

    <section id="market" class="idx-Section">
      <h2>Market Wire</h2>
      <h3 class="idx-GroupTitle">Opportunities</h3>
      <div class="idx-Grid">
        <article v-for="e in opportunities" :key="e.kind" class="idx-Card" :class="`idx-Card-${e.rarity}`">
          <h3>{{ e.title }}</h3>
          <div class="idx-Pills">
            <span class="idx-Pill" :class="`idx-Pill-${e.rarity}`">{{ RARITY_LABELS[e.rarity] }}</span>
            <span v-if="e.shady" class="idx-Pill idx-Pill-shady">Shady</span>
          </div>
          <p>{{ e.subtitle }}</p>
        </article>
      </div>
      <h3 class="idx-GroupTitle">Scandals</h3>
      <div class="idx-Grid idx-Grid-wide">
        <article v-for="e in scandals" :key="e.kind" class="idx-Card" :class="`idx-Card-${e.rarity}`">
          <h3>{{ e.title }}</h3>
          <div class="idx-Pills">
            <span class="idx-Pill" :class="`idx-Pill-${e.rarity}`">{{ RARITY_LABELS[e.rarity] }}</span>
          </div>
          <p class="idx-Flavour">{{ e.subtitle }}</p>
          <dl v-if="e.effect.type === 'scandal'" class="idx-Stats">
            <template v-for="o in e.effect.options" :key="o.label">
              <dt>{{ o.label }}</dt><dd>{{ o.detail }}</dd>
            </template>
            <dt>Ignore it</dt><dd>{{ e.effect.ignoredText }}</dd>
          </dl>
        </article>
      </div>
      <p v-if="opportunities.length + scandals.length === 0" class="idx-Empty">Nothing on the wire matches.</p>
    </section>

    <section id="perks" class="idx-Section">
      <h2>Legacy perks</h2>
      <p class="idx-Rules">Bought with Legacy; every rank lasts the whole bloodline.</p>
      <div class="idx-Grid">
        <article v-for="p in perks" :key="p.id" class="idx-Card">
          <h3>{{ p.label }}</h3>
          <div class="idx-Pills">
            <span class="idx-Pill">{{ p.maxRank === null ? 'No rank limit' : `Up to rank ${p.maxRank}` }}</span>
          </div>
          <p>{{ p.description }}</p>
        </article>
      </div>
      <p v-if="perks.length === 0" class="idx-Empty">No perks match.</p>
    </section>

    <section id="classes" class="idx-Section">
      <h2>Social classes</h2>
      <p class="idx-Rules">Reach the net worth to face the gate's boss.</p>
      <div class="idx-Grid">
        <article v-for="c in classes" :key="c.level" class="idx-Card">
          <h3>{{ c.label }}</h3>
          <div class="idx-Pills">
            <span class="idx-Pill">Class {{ c.level }}</span>
            <span v-if="c.level > 0" class="idx-Pill">{{ formatCurrency(c.threshold) }} net worth</span>
          </div>
          <p class="idx-Flavour">{{ c.description }}</p>
          <p class="idx-Note">{{ c.perkSummary }}</p>
        </article>
      </div>
      <p v-if="classes.length === 0" class="idx-Empty">No classes match.</p>
    </section>

    <section id="rooms" class="idx-Section">
      <h2>Rooms</h2>
      <p class="idx-Rules">Preview: the game's look will follow your class through these rooms. Each room shows its light and dark version.</p>
      <article v-for="r in rooms" :key="r.room.id" class="idx-RoomRow" :data-testid="`room-${r.room.id}`">
        <header class="idx-RoomHead">
          <h3>{{ r.room.name }}</h3>
          <div class="idx-Pills">
            <span v-for="c in r.classes" :key="c.level" class="idx-Pill">{{ c.label }}</span>
          </div>
          <p class="idx-Flavour">{{ r.room.blurb }}</p>
          <p class="idx-Note">{{ r.room.materials }}</p>
        </header>
        <div class="idx-RoomPair">
          <RoomPreview
            v-for="scheme in SCHEMES"
            :key="scheme"
            :room="r.room"
            :scheme="scheme"
            :level="r.classes[0].level"
            :class-label="r.classes[0].label"
            :net-worth="formatCurrency(r.netWorth)"
            :item-label="r.item.label"
            :next-cost="formatCurrency(r.item.baseCost)"
            :image="itemImageUrl('jobs', r.item.label)"
          />
        </div>
      </article>
      <p v-if="rooms.length === 0" class="idx-Empty">No rooms match.</p>
    </section>

    <section id="achievements" class="idx-Section">
      <h2>Achievements</h2>
      <p class="idx-Rules">Each one adds {{ pct(ACHIEVEMENT_INCOME_BONUS) }} to all income, for good. Hidden ones show as ??? in the game until earned.</p>
      <div class="idx-Grid">
        <article v-for="a in achievements" :key="a.id" class="idx-Card">
          <h3>{{ a.name }}</h3>
          <div v-if="a.hidden" class="idx-Pills">
            <span class="idx-Pill">Hidden</span>
          </div>
          <p>{{ a.description }}</p>
        </article>
      </div>
      <p v-if="achievements.length === 0" class="idx-Empty">No achievements match.</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { JOBS, BUSINESSES, SYNERGY_JOB_FOR_BUSINESS, itemImageUrl, type Sector } from '../data/items'
import { ADVISORS, ROLE_LABELS, type AdvisorDef } from '../data/advisors'
import { HEIR_TRAITS, INHERITED_TRAITS } from '../data/heirs'
import { BOSSES } from '../data/bosses'
import { MARKET_EVENTS, RARITY_LABELS, type EventRarity } from '../data/events'
import { LEGACY_PERKS } from '../data/perks'
import { SOCIAL_CLASSES } from '../data/classes'
import { ACHIEVEMENTS, ACHIEVEMENT_INCOME_BONUS } from '../data/achievements'
import { formatCurrency, formatDuration } from '../utils/format'
import { ROOMS } from '../data/rooms'
import { GATE_NET_WORTH } from '../data/classes'
import RoomPreview from './RoomPreview.vue'

const SCHEMES = ['light', 'dark'] as const

const query = ref('')

const SECTOR_LABELS: Readonly<Record<Sector, string>> = {
  food: 'Food',
  property: 'Property',
  finance: 'Finance',
  infrastructure: 'Infrastructure',
  media: 'Media',
  services: 'Services'
}

const FAMILY_LABELS: Readonly<Record<string, string>> = {
  clicks: 'Click pay',
  business: 'Business income',
  costs: 'Purchase costs',
  automation: 'Automation',
  windfalls: 'Windfalls',
  events: 'Market Wire',
  bossTime: 'Boss time',
  twists: 'Boss twists',
  scandals: 'Scandals',
  trustFund: 'Trust fund',
  milestones: 'Milestones',
  financeTeam: 'Finance team',
  food: 'Food lobbying',
  property: 'Property lobbying',
  finance: 'Finance lobbying',
  media: 'Media lobbying',
  infrastructure: 'Infrastructure lobbying',
  services: 'Services lobbying',
  allowance: 'Allowance',
  offline: 'Away earnings'
}

const RARITY_ORDER: Readonly<Record<EventRarity, number>> = { common: 0, rare: 1, legendary: 2 }

function sectorLabel(s: Sector): string {
  return SECTOR_LABELS[s]
}

function familyLabel(f: string): string {
  return FAMILY_LABELS[f] ?? f
}

function pct(share: number): string {
  return `${Math.round(share * 100)}%`
}

function growth(scale: number): string {
  return `${((scale - 1) * 100).toFixed(1)}%`
}

// Keep a card when every word of the filter appears somewhere in its text
function matches(...parts: Array<string | null | undefined>): boolean {
  const words = query.value.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const text = parts.filter(Boolean).join(' ').toLowerCase()
  return words.every((w) => text.includes(w))
}

const jobs = computed(() => JOBS.filter((j) => matches(j.label, sectorLabel(j.sector), j.synergyNote, 'job')))
const businesses = computed(() =>
  BUSINESSES.filter((b) =>
    matches(b.label, sectorLabel(b.sector), SYNERGY_JOB_FOR_BUSINESS[b.id]?.label, 'business')
  )
)

const advisorGroups = computed(() => {
  const groups = new Map<string, AdvisorDef[]>()
  for (const a of ADVISORS) {
    const roles = a.roles.map((r) => ROLE_LABELS[r]).join(' ')
    if (!matches(a.name, a.effectText, a.costText, roles, RARITY_LABELS[a.rarity], familyLabel(a.family), 'advisor')) {
      continue
    }
    const list = groups.get(a.family) ?? []
    list.push(a)
    groups.set(a.family, list)
  }
  return [...groups.entries()].map(([family, advisors]) => ({
    family,
    advisors: [...advisors].sort((x, y) => RARITY_ORDER[x.rarity] - RARITY_ORDER[y.rarity])
  }))
})

const heirTraits = computed(() =>
  [...HEIR_TRAITS]
    .sort((x, y) => RARITY_ORDER[x.rarity] - RARITY_ORDER[y.rarity])
    .filter((t) => matches(t.name, t.description, RARITY_LABELS[t.rarity], 'heir trait'))
)
const inheritedTraits = computed(() => INHERITED_TRAITS.filter((t) => matches(t.name, t.description, 'heir family inherited')))

const bosses = computed(() =>
  BOSSES.filter((b) => matches(b.title, b.blurb, b.twistText, b.conditionText, SOCIAL_CLASSES[b.gate]?.label, 'boss'))
)

const opportunities = computed(() =>
  MARKET_EVENTS.filter((e) => e.effect.type !== 'scandal')
    .sort((x, y) => RARITY_ORDER[x.rarity] - RARITY_ORDER[y.rarity])
    .filter((e) => matches(e.title, e.subtitle, RARITY_LABELS[e.rarity], e.shady ? 'shady' : '', 'opportunity market'))
)
const scandals = computed(() =>
  MARKET_EVENTS.filter((e) => e.effect.type === 'scandal').filter((e) => {
    const opts = e.effect.type === 'scandal' ? e.effect.options.map((o) => `${o.label} ${o.detail}`).join(' ') : ''
    return matches(e.title, e.subtitle, opts, RARITY_LABELS[e.rarity], 'scandal market')
  })
)

const perks = computed(() => LEGACY_PERKS.filter((p) => matches(p.label, p.description, 'perk legacy')))
const classes = computed(() => SOCIAL_CLASSES.filter((c) => matches(c.label, c.description, c.perkSummary, 'class')))
// Each room with its classes, a net worth part way to its first gate and a Job from that stretch of the ladder
const rooms = computed(() =>
  ROOMS.map((room) => {
    const classes = SOCIAL_CLASSES.filter((c) => room.classLevels.includes(c.level))
    const level = classes[0]?.level ?? 0
    const nextGate = GATE_NET_WORTH[level + 1] ?? GATE_NET_WORTH[level] * 1e6
    const item = JOBS[Math.round((level / (SOCIAL_CLASSES.length - 1)) * (JOBS.length - 1))]
    return { room, classes, netWorth: nextGate * 0.4, item }
  }).filter(({ room, classes }) =>
    matches(room.name, room.blurb, room.materials, ...classes.map((c) => c.label), 'room theme decor')
  )
)
const achievements = computed(() => ACHIEVEMENTS.filter((a) => matches(a.name, a.description, 'achievement')))

const sections = computed(() => [
  { id: 'jobs', title: 'Jobs', count: jobs.value.length },
  { id: 'businesses', title: 'Businesses', count: businesses.value.length },
  { id: 'advisors', title: 'Advisors', count: advisorGroups.value.reduce((n, g) => n + g.advisors.length, 0) },
  { id: 'heirs', title: 'Heirs', count: heirTraits.value.length + inheritedTraits.value.length },
  { id: 'bosses', title: 'Bosses', count: bosses.value.length },
  { id: 'market', title: 'Market Wire', count: opportunities.value.length + scandals.value.length },
  { id: 'perks', title: 'Perks', count: perks.value.length },
  { id: 'classes', title: 'Classes', count: classes.value.length },
  { id: 'rooms', title: 'Rooms', count: rooms.value.length },
  { id: 'achievements', title: 'Achievements', count: achievements.value.length }
])
</script>

<style>
/* A page to read, so text can be selected here */
html,
body {
  user-select: text;
  -webkit-user-select: text;
}

.idx-Page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 16px 64px;
}

.idx-Header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.idx-Title {
  margin: 0;
  font-size: 32px;
  color: var(--color-purple);
}

.idx-Lede {
  margin: 4px 0 0;
  color: var(--color-muted);
}

.idx-Back {
  padding: 7px 14px;
  border: 1px solid var(--color-strong-line);
  border-radius: var(--radius);
  color: var(--color-body);
  font-weight: 600;
  font-size: 14px;
  text-decoration: none;
  white-space: nowrap;
}

.idx-Back:hover {
  background: var(--color-btn-outline-hover);
}

.idx-Nav {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  gap: 6px;
  margin: 20px -16px 0;
  padding: 10px 16px;
  overflow-x: auto;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  scrollbar-width: thin;
}

.idx-NavLink {
  flex: none;
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  color: var(--color-body);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
}

.idx-NavLink:hover {
  border-color: var(--color-purple);
}

.idx-Count {
  color: var(--color-muted);
  font-weight: 400;
}

.idx-Search {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
}

.idx-SearchLabel {
  font-weight: 700;
  font-size: 14px;
}

.idx-Search input {
  flex: 1;
  max-width: 420px;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-card);
  color: var(--color-body);
  font: inherit;
}

.idx-Section {
  scroll-margin-top: 64px;
  margin-top: 36px;
}

.idx-Section h2 {
  margin: 0 0 4px;
  font-size: 24px;
  border-bottom: 2px solid var(--color-strong-line);
  padding-bottom: 4px;
}

.idx-Rules {
  margin: 6px 0 12px;
  color: var(--color-muted);
  font-size: 14px;
}

.idx-Group + .idx-Group {
  margin-top: 18px;
}

.idx-GroupTitle {
  margin: 18px 0 8px;
  font-size: 15px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-muted);
}

.idx-Grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.idx-Grid-wide {
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
}

@media (max-width: 420px) {
  .idx-Grid,
  .idx-Grid-wide {
    grid-template-columns: 1fr;
  }
}

.idx-Card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-top: 3px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 14px;
}

.idx-Card h3 {
  margin: 0;
  font-size: 17px;
}

.idx-Card p {
  margin: 0;
}

.idx-Card-rare {
  border-top-color: var(--color-purple);
}

.idx-Card-legendary {
  border-top-color: var(--color-gold);
}

.idx-Img {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: var(--radius);
  background: var(--color-card-subtle);
}

.idx-Pills {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.idx-Pill {
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--color-pip-bg);
  color: var(--color-pip-fg);
  font-size: 12px;
  font-weight: 600;
}

.idx-Pill-rare {
  background: var(--color-perk-pill-bg);
  color: var(--color-perk-pill-fg);
}

.idx-Pill-legendary {
  background: var(--color-gold-bg);
  color: var(--color-gold-fg);
}

.idx-Pill-shady {
  background: var(--color-shady-bg);
  color: var(--color-shady-fg);
}

.idx-Stats {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2px 10px;
  margin: 0;
}

.idx-Stats dt {
  font-weight: 700;
}

.idx-Stats dd {
  margin: 0;
}

.idx-Flavour {
  font-style: italic;
  color: var(--color-body-secondary);
}

.idx-Cost {
  color: var(--color-danger-fg);
}

.idx-Note {
  color: var(--color-synergy);
  font-size: 13px;
}

.idx-RoomRow {
  display: grid;
  grid-template-columns: minmax(200px, 1fr) minmax(0, 3fr);
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid var(--color-border-subtle);
}

.idx-RoomHead {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
}

.idx-RoomHead h3 {
  margin: 0;
  font-size: 19px;
}

.idx-RoomHead p {
  margin: 0;
}

.idx-RoomPair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 860px) {
  .idx-RoomRow,
  .idx-RoomPair {
    grid-template-columns: 1fr;
  }
}

.idx-Empty {
  color: var(--color-muted);
  font-style: italic;
}
</style>
