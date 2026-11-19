// Plays its share of the line check's campaigns (sim/lines.shared.ts)
import { it } from 'vitest'
import { playUnclaimedLines } from './lines.shared'

it('plays its share of the lines after elevation', () => playUnclaimedLines())
