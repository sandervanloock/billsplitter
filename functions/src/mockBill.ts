/**
 * Canned extraction result for local dev and e2e (MOCK_EXTRACT=1, or emulator
 * without a Gemini key). Two lines are deliberately fishy so the review screen
 * shows its amber ⚠: Coke Zero has low confidence, Tiramisu's printed line
 * total doesn't match qty × unit price.
 */
export const MOCK_BILL = {
  currency: 'EUR',
  billTotalCents: 10080,
  items: [
    { name: 'Burger', qty: 1, unitPriceCents: 1450, lineTotalCents: 1450, confidence: 0.98 },
    { name: 'Steak', qty: 1, unitPriceCents: 2200, lineTotalCents: 2200, confidence: 0.97 },
    { name: 'Caesar salad', qty: 1, unitPriceCents: 1280, lineTotalCents: 1280, confidence: 0.95 },
    { name: 'Fries', qty: 2, unitPriceCents: 410, lineTotalCents: 820, confidence: 0.93 },
    { name: 'Coke Zero', qty: 3, unitPriceCents: 320, lineTotalCents: 960, confidence: 0.55 },
    { name: 'Water 1L', qty: 4, unitPriceCents: 200, lineTotalCents: 800, confidence: 0.92 },
    { name: 'Bread basket', qty: 1, unitPriceCents: 220, lineTotalCents: 220, confidence: 0.9 },
    { name: 'Wine (glass)', qty: 2, unitPriceCents: 600, lineTotalCents: 1200, confidence: 0.91 },
    { name: 'Espresso', qty: 2, unitPriceCents: 250, lineTotalCents: 500, confidence: 0.96 },
    { name: 'Tiramisu', qty: 1, unitPriceCents: 650, lineTotalCents: 600, confidence: 0.88 },
  ],
};
