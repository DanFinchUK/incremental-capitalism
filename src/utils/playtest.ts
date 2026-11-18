// Playtest options: tuning still being tried out (the trial ladder) shows only
// for whoever opens the game with ?playtest in the address, and stays on in
// that browser until ?playtest=0
const KEY = 'playtest'

function readPlaytest(): boolean {
  try {
    if (typeof location !== 'undefined') {
      const flag = new URLSearchParams(location.search).get(KEY)
      if (flag !== null) {
        if (flag === '0') localStorage.removeItem(KEY)
        else localStorage.setItem(KEY, '1')
      }
    }
    return typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export const PLAYTEST = readPlaytest()
