// Reloads into another save slot, going straight into its family rather than
// stopping at the menu first. Its own module so tests can stand it in.
const ENTER_KEY = 'enterOnLoad'

export function reloadPage(): void {
  try {
    sessionStorage.setItem(ENTER_KEY, '1')
  } catch {
    // Without it, the menu shows first as on any visit
  }
  location.reload()
}

// Whether this load came from choosing a family (asked once)
export function takeEnterOnLoad(): boolean {
  try {
    const set = sessionStorage.getItem(ENTER_KEY) === '1'
    sessionStorage.removeItem(ENTER_KEY)
    return set
  } catch {
    return false
  }
}
