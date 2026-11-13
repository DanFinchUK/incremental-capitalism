import { onMounted, onUnmounted } from 'vue'

// Close a modal with Escape while it is open.
export function useEscapeKey(isOpen: () => boolean, close: () => void): void {
  function onKeyDown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape' && isOpen()) {
      close()
    }
  }
  onMounted(() => window.addEventListener('keydown', onKeyDown))
  onUnmounted(() => window.removeEventListener('keydown', onKeyDown))
}
