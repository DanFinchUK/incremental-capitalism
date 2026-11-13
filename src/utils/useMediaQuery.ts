import { onMounted, onUnmounted, ref, type Ref } from 'vue'

// Tracks a CSS media query. False where matchMedia doesn't exist (tests).
export function useMediaQuery(query: string): Ref<boolean> {
  const matches = ref(false)
  let list: MediaQueryList | null = null
  const update = () => {
    matches.value = list?.matches ?? false
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    list = window.matchMedia(query)
    update()
  }
  onMounted(() => list?.addEventListener('change', update))
  onUnmounted(() => list?.removeEventListener('change', update))
  return matches
}

// The phone layout: one section at a time, with Get paid docked at the bottom
export const PHONE_QUERY = '(max-width: 720px)'
