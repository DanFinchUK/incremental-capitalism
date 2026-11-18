import { it } from 'vitest'
import { runSoloShard } from './solo.shared'

it('plays solo shard 0', () => runSoloShard(0, 4))
