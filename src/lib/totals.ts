import { largestRemainderSplit } from './money';
import type { Item, Participant } from './model';

/** Σ shared units × unit price — the pool divided evenly across everyone. */
export function sharedPoolCents(items: Item[]): number {
  return items.reduce((sum, it) => sum + it.sharedQty * it.unitPriceCents, 0);
}

/** Σ direct claims for one participant. */
export function directCents(items: Item[], participantId: string): number {
  return items.reduce((sum, it) => sum + (it.claims[participantId] ?? 0) * it.unitPriceCents, 0);
}

/** Participants in deterministic ÷N order (joinedAt, id as tiebreaker). */
export function splitOrder(participants: Participant[]): Participant[] {
  return [...participants].sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
}

/**
 * Per-person totals while the session is open: direct claims + largest-remainder
 * share of the shared pool. Deterministic order means every client shows the
 * exact same cent amounts; the same function freezes owedCents at close.
 */
export function computeOwed(items: Item[], participants: Participant[]): Map<string, number> {
  const ordered = splitOrder(participants);
  const shares = largestRemainderSplit(sharedPoolCents(items), ordered.length);
  const owed = new Map<string, number>();
  ordered.forEach((p, i) => owed.set(p.id, directCents(items, p.id) + shares[i]));
  return owed;
}

/** This participant's slice of the shared pool (what P2 shows as "Your share ÷N"). */
export function mySharedShareCents(items: Item[], participants: Participant[], participantId: string): number {
  const ordered = splitOrder(participants);
  const idx = ordered.findIndex((p) => p.id === participantId);
  if (idx < 0) return 0;
  return largestRemainderSplit(sharedPoolCents(items), ordered.length)[idx];
}

/** Units of an item still claimable by participants (qty minus shared minus claimed). */
export function availableQty(item: Item): number {
  return item.qty - item.sharedQty - item.claimedQty;
}

/** Σ qty × unit price over all items — what the bill's lines add up to. */
export function itemsTotalCents(items: Item[]): number {
  return items.reduce((sum, it) => sum + it.qty * it.unitPriceCents, 0);
}

/** Value already covered: shared units + directly claimed units. */
export function assignedCents(items: Item[]): number {
  return items.reduce((sum, it) => sum + (it.sharedQty + it.claimedQty) * it.unitPriceCents, 0);
}

export function allAssigned(items: Item[]): boolean {
  return items.every((it) => it.sharedQty + it.claimedQty === it.qty);
}
