/** Plain data shapes shared by app code, tests and the seed script. No Firebase imports. */

export type SessionStatus = 'setup' | 'open' | 'closed' | 'settled';

export interface Session {
  id: string;
  status: SessionStatus;
  name: string;
  hostUid: string;
  hostName: string;
  iban: string;
  currency: 'EUR';
  /** Printed bill total as extracted/edited; 0 when unknown. */
  billTotalCents: number;
  /** Denormalized for the OG link-preview function. */
  itemCount: number;
  createdAt: number; // epoch millis
  closedAt: number | null;
}

export interface Item {
  id: string;
  name: string;
  unitPriceCents: number;
  qty: number;
  /** How many units the host marked as shared-by-all. */
  sharedQty: number;
  /** participantId -> units claimed directly. */
  claims: Record<string, number>;
  /** Validated denormalized counter: sum of claims values. */
  claimedQty: number;
  lowConfidence: boolean;
  order: number;
}

export interface Participant {
  id: string;
  displayName: string;
  isManual: boolean;
  joinedAt: number; // epoch millis
  /** Frozen at close by the host's batch write. */
  owedCents: number | null;
  paid: boolean;
  paidAt: number | null;
}

export const SESSION_TTL_DAYS = 7;

export function sessionPath(id: string): string {
  return `sessions/${id}`;
}
export function itemsPath(sessionId: string): string {
  return `sessions/${sessionId}/items`;
}
export function participantsPath(sessionId: string): string {
  return `sessions/${sessionId}/participants`;
}

export function joinUrl(sessionId: string, origin?: string): string {
  const base = origin ?? (typeof location !== 'undefined' ? location.origin : '');
  return `${base}/j/${sessionId}`;
}
