import { describe, expect, it } from 'vitest';
import type { Item, Participant } from './model';
import {
  allAssigned,
  assignedCents,
  availableQty,
  computeOwed,
  directCents,
  itemsTotalCents,
  mySharedShareCents,
  sharedPoolCents,
  splitOrder,
} from './totals';

function item(partial: Partial<Item> & Pick<Item, 'id' | 'unitPriceCents' | 'qty'>): Item {
  return { name: partial.id, sharedQty: 0, claims: {}, claimedQty: 0, lowConfidence: false, order: 0, ...partial };
}
function person(id: string, joinedAt: number): Participant {
  return { id, displayName: id, isManual: false, joinedAt, owedCents: null, paid: false, paidAt: null };
}

const items: Item[] = [
  item({ id: 'burger', unitPriceCents: 1450, qty: 1, claims: { maya: 1 }, claimedQty: 1 }),
  item({ id: 'wine', unitPriceCents: 600, qty: 3, claims: { maya: 1, sam: 2 }, claimedQty: 3 }),
  item({ id: 'water', unitPriceCents: 200, qty: 4, sharedQty: 2, claims: { jonas: 2 }, claimedQty: 2 }),
  item({ id: 'bread', unitPriceCents: 220, qty: 1, sharedQty: 1 }),
];
const people = [person('sam', 1), person('maya', 2), person('jonas', 3), person('ana', 4)];

describe('totals', () => {
  it('computes the shared pool', () => {
    expect(sharedPoolCents(items)).toBe(2 * 200 + 220); // 620
  });

  it('computes direct claims per person', () => {
    expect(directCents(items, 'maya')).toBe(1450 + 600);
    expect(directCents(items, 'sam')).toBe(1200);
    expect(directCents(items, 'ana')).toBe(0);
  });

  it('orders the ÷N split by joinedAt with id tiebreak', () => {
    const shuffled = [people[2], people[0], people[3], people[1]];
    expect(splitOrder(shuffled).map((p) => p.id)).toEqual(['sam', 'maya', 'jonas', 'ana']);
    const tied = [person('b', 5), person('a', 5)];
    expect(splitOrder(tied).map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('per-person owed sums exactly to the items total when all assigned', () => {
    expect(allAssigned(items)).toBe(true);
    const owed = computeOwed(items, people);
    const sum = [...owed.values()].reduce((a, b) => a + b, 0);
    expect(sum).toBe(itemsTotalCents(items));
    expect(owed.get('maya')).toBe(2050 + 155);
    expect(owed.get('ana')).toBe(155);
  });

  it('uneven pools stay exact: earliest joiners absorb the extra cents', () => {
    const pool = [item({ id: 'p', unitPriceCents: 1000, qty: 1, sharedQty: 1 })];
    const owed = computeOwed(pool, [person('a', 1), person('b', 2), person('c', 3)]);
    expect(owed.get('a')).toBe(334);
    expect(owed.get('b')).toBe(333);
    expect(owed.get('c')).toBe(333);
    expect(mySharedShareCents(pool, [person('a', 1), person('b', 2), person('c', 3)], 'a')).toBe(334);
  });

  it('tracks availability and assignment progress', () => {
    const it2 = item({ id: 'coke', unitPriceCents: 320, qty: 3, claims: { maya: 1 }, claimedQty: 1 });
    expect(availableQty(it2)).toBe(2);
    expect(allAssigned([it2])).toBe(false);
    expect(assignedCents([it2])).toBe(320);
    expect(itemsTotalCents([it2])).toBe(960);
  });
});
