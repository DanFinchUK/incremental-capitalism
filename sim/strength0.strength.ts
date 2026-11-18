import { runShard } from './strength.shared'
import { it } from 'vitest'

it('plays shard 0', () => runShard(0, 4))
