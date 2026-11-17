// The six kinds of business and job, as the cards name them
import type { Sector } from '../data/items'

export const SECTOR_LABELS: Readonly<Record<Sector, string>> = {
  food: 'Food',
  property: 'Property',
  finance: 'Finance',
  infrastructure: 'Infrastructure',
  media: 'Media',
  services: 'Services'
}
