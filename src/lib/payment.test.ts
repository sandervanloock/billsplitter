import { describe, expect, it } from 'vitest';
import { epcPayloadFor, paymentReference } from './payment';

describe('paymentReference', () => {
  it('joins session name and display name', () => {
    expect(paymentReference('Bellini', 'Maya')).toBe('Bellini - Maya');
  });

  it('sanitizes to the EPC charset and caps at 140', () => {
    expect(paymentReference('Café “Bellini” @ 9€', 'Søren')).toBe('Cafe Bellini 9 - S ren');
    expect(paymentReference('x'.repeat(140), 'y'.repeat(140))).toHaveLength(140);
  });
});

describe('epcPayloadFor', () => {
  const session = { hostName: 'Sam', iban: 'BE68 5390 0754 7034', name: 'Bellini' };

  it('builds the exact payload from session + participant', () => {
    expect(epcPayloadFor(session, { displayName: 'Maya', owedCents: 2205 }).split('\n')).toEqual([
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

  it('treats a null owedCents as zero', () => {
    expect(epcPayloadFor(session, { displayName: 'Maya', owedCents: null })).toContain('EUR0.00');
  });
});
