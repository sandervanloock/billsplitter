/** All money in the app is integer cents. */

export function formatCents(cents: number, withSymbol = true): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const euros = Math.floor(abs / 100);
  const rest = String(abs % 100).padStart(2, '0');
  return `${sign}${withSymbol ? '€' : ''}${euros}.${rest}`;
}

/** Parse a user-typed euro amount ("14.50", "14,5", "€ 14") into cents. Null when not a number. */
export function parseEuroToCents(input: string): number | null {
  const cleaned = input.replace(/[€\s]/g, '').replace(',', '.');
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const [euros, dec = ''] = cleaned.split('.');
  return Number(euros) * 100 + Number(dec.padEnd(2, '0') || '0');
}

/**
 * Split `totalCents` into `n` integer shares that sum exactly to the total
 * (largest-remainder: every share gets floor(total/n), the first `total % n`
 * positions get one extra cent). Caller passes positions in a deterministic
 * order (participants ordered by joinedAt) so all clients render identical numbers.
 */
export function largestRemainderSplit(totalCents: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(totalCents / n);
  const extra = totalCents - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}

/* ---------------- IBAN ---------------- */

export function normalizeIban(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase();
}

export function formatIban(input: string): string {
  return normalizeIban(input).replace(/(.{4})/g, '$1 ').trim();
}

/** ISO 13616 mod-97 checksum (works for any SEPA country, e.g. BE/NL/FR/DE). */
export function validateIban(input: string): boolean {
  const iban = normalizeIban(input);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const v = ch >= 'A' ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of v) remainder = (remainder * 10 + Number(d)) % 97;
  }
  return remainder === 1;
}

/* ---------------- EPC069-12 ("EPC QR") ---------------- */

/**
 * The EPC charset is a restricted Latin set; banking apps reject payloads with
 * stray characters. Replace anything outside the safe subset with a space.
 */
export function sanitizeEpcText(input: string, maxLen: number): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics: é → e
    .replace(/[^A-Za-z0-9 /\-?:().,'+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

export interface EpcPayloadInput {
  beneficiaryName: string;
  iban: string;
  amountCents: number;
  remittance: string;
}

/**
 * Build the EPC069-12 quick-response payload (the "EPC QR" every Belgian
 * banking app scans). Frozen 2012 format, version 002 (BIC optional in EEA),
 * unstructured remittance.
 */
export function buildEpcPayload({ beneficiaryName, iban, amountCents, remittance }: EpcPayloadInput): string {
  const name = sanitizeEpcText(beneficiaryName, 70) || 'Host';
  const ref = sanitizeEpcText(remittance, 140);
  const amount = `EUR${(amountCents / 100).toFixed(2)}`;
  return ['BCD', '002', '1', 'SCT', '', name, normalizeIban(iban), amount, '', '', ref].join('\n');
}
