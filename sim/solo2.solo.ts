import { it } from 'vitest'
import { runSoloShard } from './solo.shared'

it('plays solo shard 2', () => runSoloShard(2, 4))
