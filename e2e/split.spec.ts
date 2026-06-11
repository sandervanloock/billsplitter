import { expect, test, type Page } from '@playwright/test';

/** 1×1 white JPEG — the mock extractor never looks at the pixels. */
const TINY_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q==',
  'base64',
);

/** Click the + of an item's stepper `times` times, waiting for each write to land. */
async function plus(page: Page, list: string, itemText: string, times: number) {
  const row = page.getByTestId(list).locator('.item', { hasText: itemText });
  for (let i = 0; i < times; i++) {
    await row.locator('.pm.act').click();
    await expect(row.locator('.qty b')).toHaveText(String(i + 1));
  }
}

test('host scans & shares, participant joins & claims live, close → EPC QR → paid', async ({ browser }) => {
  const hostCtx = await browser.newContext();
  const partCtx = await browser.newContext();
  const host = await hostCtx.newPage();
  const part = await partCtx.newPage();

  // ---- H0: landing → H1: scan & set up ----
  await host.goto('/');
  await host.getByRole('link', { name: 'Start a session' }).click();
  await host.getByPlaceholder('Dinner at Italian').fill('Friday @ Bellini');
  await host.getByPlaceholder('Your Name').fill('Sam');
  await host.getByPlaceholder('BE68 5390 0754 7034').fill('BE68 5390 0754 7034');
  await host.locator('input[type=file]').setInputFiles({ name: 'bill.jpg', mimeType: 'image/jpeg', buffer: TINY_JPEG });
  await expect(host.getByText('✓ Bill read · 10 items')).toBeVisible({ timeout: 20_000 });
  await host.getByRole('button', { name: 'Review items' }).click();

  // ---- H2: review ----
  await expect(host.getByText('Bill read · 10 items')).toBeVisible();
  await expect(host.locator('.total .big')).toHaveText('€100.80');
  // low-confidence / mismatching lines carry the amber flag
  await expect(host.locator('.item[data-name="Coke Zero"]').getByText('⚠')).toBeVisible();
  await expect(host.locator('.item[data-name="Tiramisu"]').getByText('⚠')).toBeVisible();
  await host.getByRole('button', { name: 'Confirm & share' }).click();

  // ---- H3: share & lobby ----
  await expect(host.getByText('Scan to join')).toBeVisible();
  const sessionId = host.url().match(/\/s\/([^/?#]+)/)![1];

  // ---- P1: join ----
  await part.goto(`/join/${sessionId}`);
  await expect(part.getByText('You’re invited to')).toBeVisible();
  await expect(part.getByText('hosted by Sam')).toBeVisible();
  await part.getByPlaceholder('Maya').fill('Maya');
  await part.getByRole('button', { name: 'Join' }).click();

  // host lobby sees Maya stream in
  await expect(host.locator('.item', { hasText: 'Maya' })).toBeVisible();

  // ---- P2: pick items ----
  await expect(part.getByText('Hi Maya 👋')).toBeVisible();
  await part.getByTestId('bill-list').locator('.item', { hasText: 'Burger' }).locator('.check').click();
  await plus(part, 'bill-list', 'Wine (glass)', 1);
  await expect(part.locator('.total .big')).toHaveText('€20.50'); // 14.50 + 6.00

  // ---- H4: distribute — realtime totals from the participant's claims ----
  await host.getByRole('button', { name: 'Start distributing' }).click();
  await expect(host.getByTestId('people-list').locator('.item', { hasText: 'Maya' })).toContainText('€20.50');

  // host marks everything Maya didn't take as shared by all
  for (const single of ['Steak', 'Caesar salad', 'Bread basket', 'Tiramisu']) {
    await host.getByTestId('shared-list').locator('.item', { hasText: single }).locator('.check').click();
  }
  await plus(host, 'shared-list', 'Fries', 2);
  await plus(host, 'shared-list', 'Coke Zero', 3);
  await plus(host, 'shared-list', 'Water 1L', 4);
  await plus(host, 'shared-list', 'Wine (glass)', 1); // 1 left after Maya's glass
  await plus(host, 'shared-list', 'Espresso', 2);
  await expect(host.getByText('💧 Shared total')).toBeVisible();
  // shared pool = 100.80 − burger 14.50 − Maya's wine 6.00
  await expect(host.locator('.box', { hasText: 'Shared total' }).locator('.h-sm')).toHaveText('€80.30');

  // participant sees the ÷2 share live: 20.50 + 80.30/2 = 60.65
  await expect(part.getByText('Your share · ÷2')).toBeVisible();
  await expect(part.locator('.total .big')).toHaveText('€60.65');

  // participant locks in → waiting room
  await part.getByRole('button', { name: 'Done' }).click();
  await expect(part.getByText('Waiting for Sam to close')).toBeVisible();

  // ---- H5: overview & close ----
  await host.getByRole('button', { name: 'Review & close' }).click();
  await expect(host.getByText('All items assigned')).toBeVisible();
  await expect(host.getByText('€100.80 of €100.80')).toBeVisible();
  await host.getByRole('button', { name: 'Close session' }).click();

  // ---- P4: the waiting screen flips to payment automatically ----
  await expect(part.getByText('Pay your share')).toBeVisible();
  await expect(part.getByText('You owe Sam')).toBeVisible();

  // EPC069-12 payload on the QR
  const payload = await part.locator('img[data-payload]').getAttribute('data-payload');
  expect(payload!.split('\n')).toEqual([
    'BCD',
    '002',
    '1',
    'SCT',
    '',
    'Sam',
    'BE68539007547034',
    'EUR60.65',
    '',
    '',
    'Friday Bellini - Maya',
  ]);

  // ---- P5 + H6: self-reported payment shows up for the host ----
  await part.getByRole('button', { name: 'I’ve paid' }).click();
  await expect(part.getByText('Paid €60.65 to Sam')).toBeVisible();
  await expect(host.getByText('Getting paid back')).toBeVisible();
  await expect(host.locator('.item', { hasText: 'Maya' }).getByText('paid')).toBeVisible();
  await expect(host.getByText('Everyone’s settled')).toBeVisible();
});
