import { expect, test, type Page } from '@playwright/test'

/**
 * The reason this app was rewritten.
 *
 * The previous Streamlit version kept scores in server memory tied to a
 * websocket session. A refresh, or backgrounding Safari on a phone to check
 * another app, dropped the socket and lost the game. These tests assert that
 * cannot happen again. They run against WebKit on an iPhone viewport, because
 * iOS Safari is where the original failure was felt.
 *
 * There is no Supabase configured when these run. The persistence guarantee
 * has to hold on IndexedDB alone.
 */

async function startGame(page: Page, names: string[]) {
  await page.goto('/games/new')
  for (const name of names) {
    await page.getByPlaceholder('Guest name').fill(name)
    await page.getByRole('button', { name: 'Add', exact: true }).click()
  }
  await page.getByRole('button', { name: 'Start game' }).click()
  await page.waitForURL((url) => /\/games\/[0-9a-f-]{36}$/.test(url.pathname))
  return page.url()
}

function panelFor(page: Page, player: string) {
  return page.getByRole('button', { name: new RegExp(player) }).first()
}

async function expand(page: Page, player: string) {
  const panel = panelFor(page, player)
  if ((await panel.getAttribute('aria-expanded')) !== 'true') await panel.click()
}

/** Words render as card chips, so the typed string never appears in the DOM. */
async function addWord(page: Page, player: string, word: string) {
  await expand(page, player)
  const input = page.getByPlaceholder('Type a word')
  await input.fill(word)
  await input.press('Enter')
  await expect(page.getByText('No words yet.')).toBeHidden()
}

test('a scored round survives a hard refresh', async ({ page }) => {
  const gameUrl = await startGame(page, ['Dan', 'Kany'])

  // THIN defaults to the TH+IN split, worth 16, plus the 10 point longest-word
  // bonus because Kany has played nothing. The panel header shows 26.
  await addWord(page, 'Dan', 'THIN')
  await expect(panelFor(page, 'Dan')).toContainText('26')

  await page.reload({ waitUntil: 'networkidle' })

  expect(page.url()).toBe(gameUrl)
  await expect(panelFor(page, 'Dan')).toContainText('26')
  await expand(page, 'Dan')
  await expect(page.getByText('4 letters')).toBeVisible()
})

test('a scored round survives the tab being backgrounded and restored', async ({
  page,
  context,
}) => {
  await startGame(page, ['Dan', 'Kany'])
  // QUIET defaults to QU+I+E+T, worth 16, plus the 10 point bonus.
  await addWord(page, 'Dan', 'QUIET')
  await expect(panelFor(page, 'Dan')).toContainText('26')

  // Open another tab and come back, the closest stand-in for switching apps.
  const other = await context.newPage()
  await other.goto('/games')
  await other.close()
  await page.bringToFront()

  await page.reload({ waitUntil: 'networkidle' })
  await expect(panelFor(page, 'Dan')).toContainText('26')
})

test('a game in progress is listed after navigating away and back', async ({
  page,
}) => {
  const gameUrl = await startGame(page, ['Dan', 'Kany'])
  await addWord(page, 'Dan', 'CAT')

  await page.goto('/games')
  await expect(page.getByText('Dan').first()).toBeVisible()

  await page.goto(gameUrl)
  // CAT is 13 points plus the 10 point bonus.
  await expect(panelFor(page, 'Dan')).toContainText('23')
})

test('the app is usable with no backend configured', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  await startGame(page, ['Dan', 'Kany'])
  await addWord(page, 'Dan', 'CAT')

  // With no Supabase URL the app must say so honestly rather than claim to sync.
  await expect(page.getByRole('button', { name: /Sync status/ })).toBeVisible()
  expect(errors).toEqual([])
})

test('scoring uses the corrected card values', async ({ page }) => {
  await startGame(page, ['Dan', 'Kany'])
  await expand(page, 'Dan')

  // The previous app had E at 12 points, C at 15, N and R at 3, U at 3.
  // These are the values a player reads off the reference while scoring.
  await expect(
    page.getByRole('button', { name: 'Add one E card to unused, 2 points' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Add one C card to unused, 8 points' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Add one N card to unused, 5 points' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Add one R card to unused, 5 points' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Add one U card to unused, 4 points' }),
  ).toBeVisible()
})

test('the game is 8 rounds, not 10', async ({ page }) => {
  await startGame(page, ['Dan', 'Kany'])
  await expect(page.getByText('Round 1 of 8')).toBeVisible()
  await expect(page.getByText('Deal 3 cards')).toBeVisible()

  await page.getByRole('button', { name: '8', exact: true }).click()
  await expect(page.getByText('Round 8 of 8')).toBeVisible()
  await expect(page.getByText('Deal 10 cards')).toBeVisible()
  await expect(page.getByRole('button', { name: '9', exact: true })).toHaveCount(0)
})

test('a lost challenge can be typed as a negative', async ({ page }) => {
  await startGame(page, ['Dan', 'Kany'])
  await expand(page, 'Dan')

  // Regression: a controlled type="number" input reported "" for a lone "-",
  // which was parsed to 0 and written back, wiping the sign. Typing -13 produced
  // +13, awarding points for a challenge the player lost.
  const input = page.locator('#challenge-adjustment')
  await input.click()
  await input.press('Meta+a')
  await page.keyboard.type('-13')
  await expect(input).toHaveValue('-13')

  // Losing a challenge is the only way a round ends below zero.
  await expect(panelFor(page, 'Dan')).toContainText('-13')
})

test('the challenge sign is reachable without a minus key', async ({ page }) => {
  await startGame(page, ['Dan', 'Kany'])
  await expand(page, 'Dan')

  // iOS shows inputMode="numeric" as a keypad with no minus, so the sign has
  // to be operable as a control.
  const input = page.locator('#challenge-adjustment')
  await input.click()
  await input.press('Meta+a')
  await page.keyboard.type('13')

  await page.getByRole('button', { name: 'Won challenge' }).click()
  await expect(input).toHaveValue('-13')
  await expect(page.getByRole('button', { name: 'Lost challenge' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})
