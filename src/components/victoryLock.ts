import { onUnmounted, ref, watch, type Ref } from 'vue'

// A boss fight ends mid-tap, so the victory screen ignores choices for a
// moment: otherwise the next tap of the fight picks an advisor by accident.
export const VICTORY_LOCK_MS = 2500

export function useVictoryLock(active: () => boolean): { locked: Ref<boolean>; secondsLeft: Ref<number> } {
  const locked = ref(false)
  const secondsLeft = ref(0)
  let timer: ReturnType<typeof setInterval> | null = null

  function stop(): void {
    if (timer !== null) clearInterval(timer)
    timer = null
  }

  watch(
    active,
    (isActive) => {
      stop()
      if (!isActive) {
        locked.value = false
        return
      }
      const until = Date.now() + VICTORY_LOCK_MS
      locked.value = true
      secondsLeft.value = Math.ceil(VICTORY_LOCK_MS / 1000)
      timer = setInterval(() => {
        const left = until - Date.now()
        secondsLeft.value = Math.max(0, Math.ceil(left / 1000))
        if (left <= 0) {
          locked.value = false
          stop()
        }
      }, 100)
    },
    { immediate: true }
  )

  onUnmounted(stop)
  return { locked, secondsLeft }
}
