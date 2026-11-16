// What a PA chair shows: who sits there, after promotions and honours
import { STAFF_LABELS } from '../data/events'
import { paStanding, paTitle, type AdvisorInstance, type PaStanding } from '../engine/office'

export interface PaCard {
  chair: number
  inst: AdvisorInstance
  standing: PaStanding
  title: string
  // Their tier: a rarity, or the honour they hold
  rank: string
  service: string
  // Just the time served, for a short card
  served: string
}

export function paCards(chairs: ReadonlyArray<AdvisorInstance | null>): Array<PaCard | null> {
  return chairs.map((inst, chair) => {
    const standing = inst ? paStanding(inst) : null
    if (!inst || !standing) return null
    const served = inst.servedGenerations
    const next =
      standing.nextPromotionIn === null
        ? 'at the top'
        : `next promotion in ${standing.nextPromotionIn} gen${standing.nextPromotionIn === 1 ? '' : 's'}`
    return {
      chair,
      inst,
      standing,
      title: paTitle(standing),
      rank: standing.honour ?? STAFF_LABELS[standing.def.rarity],
      served: `Served ${served} gen${served === 1 ? '' : 's'}`,
      service: `Served ${served} gen${served === 1 ? '' : 's'} · ${next}`
    }
  })
}
