import {
  collection,
  doc,
  Timestamp,
  type DocumentReference,
  type CollectionReference,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Item, Participant, Session } from './model';

export function sessionRef(id: string): DocumentReference {
  return doc(db, 'sessions', id);
}
export function itemsRef(sessionId: string): CollectionReference {
  return collection(db, 'sessions', sessionId, 'items');
}
export function itemRef(sessionId: string, itemId: string): DocumentReference {
  return doc(db, 'sessions', sessionId, 'items', itemId);
}
export function participantsRef(sessionId: string): CollectionReference {
  return collection(db, 'sessions', sessionId, 'participants');
}
export function participantRef(sessionId: string, pid: string): DocumentReference {
  return doc(db, 'sessions', sessionId, 'participants', pid);
}

const millis = (v: unknown): number => (v instanceof Timestamp ? v.toMillis() : 0);

export function snapToSession(snap: DocumentSnapshot): Session | null {
  const d = snap.data({ serverTimestamps: 'estimate' });
  if (!d) return null;
  return {
    id: snap.id,
    status: d.status,
    name: d.name,
    hostUid: d.hostUid,
    hostName: d.hostName,
    iban: d.iban,
    currency: d.currency,
    billTotalCents: d.billTotalCents,
    itemCount: d.itemCount,
    createdAt: millis(d.createdAt),
    closedAt: d.closedAt ? millis(d.closedAt) : null,
  };
}

export function snapToItem(snap: QueryDocumentSnapshot): Item {
  const d = snap.data();
  return {
    id: snap.id,
    name: d.name,
    unitPriceCents: d.unitPriceCents,
    qty: d.qty,
    sharedQty: d.sharedQty,
    claims: d.claims ?? {},
    claimedQty: d.claimedQty,
    lowConfidence: d.lowConfidence ?? false,
    order: d.order ?? 0,
  };
}

export function snapToParticipant(snap: QueryDocumentSnapshot): Participant {
  const d = snap.data({ serverTimestamps: 'estimate' });
  return {
    id: snap.id,
    displayName: d.displayName,
    isManual: d.isManual ?? false,
    joinedAt: millis(d.joinedAt),
    owedCents: d.owedCents ?? null,
    paid: d.paid ?? false,
    paidAt: d.paidAt ? millis(d.paidAt) : null,
  };
}
