import { describe, expect, it } from 'vitest';
import {
  buildEpcPayload,
  formatCents,
  formatIban,
  largestRemainderSplit,
  parseEuroToCents,
  sanitizeEpcText,
  validateIban,
} from './money';

describe('formatCents / parseEuroToCents', () => {
  it('formats cents as euros', () => {
    expect(formatCents(7240)).toBe('€72.40');
    expect(formatCents(5)).toBe('€0.05');
    expect(formatCents(0)).toBe('€0.00');
    expect(formatCents(155, false)).toBe('1.55');
  });

  it('parses user euro input', () => {
    expect(parseEuroToCents('14.50')).toBe(1450);
    expect(parseEuroToCents('14,5')).toBe(1450);
    expect(parseEuroToCents('€ 14')).toBe(1400);
    expect(parseEuroToCents('0.05')).toBe(5);
    expect(parseEuroToCents('3.2')).toBe(320);
    expect(parseEuroToCents('abc')).toBeNull();
    expect(parseEuroToCents('1.234')).toBeNull();
    expect(parseEuroToCents('')).toBeNull();
  });

  it('round-trips', () => {
    for (const cents of [0, 1, 99, 100, 7240, 123456]) {
      expect(parseEuroToCents(formatCents(cents, false))).toBe(cents);
    }
  });
});

describe('largestRemainderSplit', () => {
  it('sums exactly to the total', () => {
    for (const total of [0, 1, 620, 7240, 9999, 10001]) {
      for (const n of [1, 2, 3, 4, 7]) {
        const shares = largestRemainderSplit(total, n);
        expect(shares).toHaveLength(n);
        expect(shares.reduce((a, b) => a + b, 0)).toBe(total);
      }
    }
  });

  it('gives the extra cents to the first positions, deterministically', () => {
    expect(largestRemainderSplit(620, 4)).toEqual([155, 155, 155, 155]);
    expect(largestRemainderSplit(1000, 3)).toEqual([334, 333, 333]);
    expect(largestRemainderSplit(7, 4)).toEqual([2, 2, 2, 1]);
  });

  it('handles degenerate inputs', () => {
    expect(largestRemainderSplit(100, 0)).toEqual([]);
    expect(largestRemainderSplit(0, 3)).toEqual([0, 0, 0]);
  });
});

describe('IBAN', () => {
  it('accepts valid Belgian and other SEPA IBANs', () => {
    expect(validateIban('BE68 5390 0754 7034')).toBe(true);
    expect(validateIban('be68539007547034')).toBe(true);
    expect(validateIban('NL91ABNA0417164300')).toBe(true);
    expect(validateIban('DE89370400440532013000')).toBe(true);
  });

  it('rejects bad checksums and garbage', () => {
    expect(validateIban('BE68 5390 0754 7035')).toBe(false);
    expect(validateIban('BE00 0000 0000 0000')).toBe(false);
    expect(validateIban('hello')).toBe(false);
    expect(validateIban('')).toBe(false);
  });

  it('formats in groups of 4', () => {
    expect(formatIban('be68539007547034')).toBe('BE68 5390 0754 7034');
  });
});

describe('EPC069-12 payload', () => {
  it('builds the exact 11-line payload', () => {
    const payload = buildEpcPayload({
      beneficiaryName: 'Sam',
      iban: 'BE68 5390 0754 7034',
      amountCents: 2205,
      remittance: 'Bellini - Maya',
    });
    expect(payload.split('\n')).toEqual([
      'BCD',
      '002',
      '1',
      'SCT',
      '',
      'Sam',
      'BE68539007547034',
      'EUR22.05',
      '',
      '',
      'Bellini - Maya',
    ]);
  });

  it('always renders two decimals', () => {
    expect(buildEpcPayload({ beneficiaryName: 'S', iban: 'BE68539007547034', amountCents: 1400, remittance: 'x' })).toContain(
      'EUR14.00',
    );
  });

  it('sanitizes the remittance and name to the EPC charset', () => {
    expect(sanitizeEpcText('Café “Bellini” @ 9€ — Maya', 140)).toBe('Cafe Bellini 9 Maya');
    expect(sanitizeEpcText('x'.repeat(200), 140)).toHaveLength(140);
    const payload = buildEpcPayload({
      beneficiaryName: 'Søren & Müller',
      iban: 'BE68539007547034',
      amountCents: 100,
      remittance: 'Friday @ Bellini — Ana',
    });
    const lines = payload.split('\n');
    expect(lines[5]).toBe('S ren Muller'); // ø has no NFKD decomposition → replaced; ü → u
    expect(lines[10]).toBe('Friday Bellini Ana');
  });
});
