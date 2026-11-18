import { it } from 'vitest'
import { runSoloShard } from './solo.shared'

it('plays solo shard 1', () => runSoloShard(1, 4))
