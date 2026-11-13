// Floating opportunities and scandals must stay fully on screen wherever
// they spawn, including the far corners of their spawn area.
import { expect, test } from '@playwright/test'
import { newGame, withStore } from './phone'

test.use({ viewport: { width: 740, height: 520 }, hasTouch: true })

for (const kind of ['quantitativeEasing', 'nonDomQuestioned']) {
  for (const [x, y] of [[82, 73], [18, 18]]) {
    test(`${kind} at ${x}%, ${y}% stays inside the viewport`, async ({ page }) => {
      await newGame(page)
      await withStore(page, `(s) => { s.spawnSpecificEvent('${kind}', Date.now()); s.activeEvent.xPct = ${x}; s.activeEvent.yPct = ${y} }`)
      const box = (await page.locator('.scn-MarketEvent').boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(740)
      expect(box.y + box.height).toBeLessThanOrEqual(520)
    })
  }
}
