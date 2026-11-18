import { it } from 'vitest'
import { runSoloShard } from './solo.shared'

it('plays solo shard 3', () => runSoloShard(3, 4))
