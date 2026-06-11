import {
  deleteDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  doc,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { itemRef, itemsRef, participantRef, sessionRef } from './fb';
import { SESSION_TTL_DAYS } from './model';
import { saveProfile } from './profile';

export class NoneLeftError extends Error {
  constructor() {
    super('Someone just took the last one');
  }
}

function ttl(): Timestamp {
  return Timestamp.fromMillis(Date.now() + SESSION_TTL_DAYS * 24 * 3600 * 1000);
}

export interface NewItem {
  name: string;
  unitPriceCents: number;
  qty: number;
  lowConfidence?: boolean;
}

export async function createSession(opts: { name: string; hostName: string; iban: string }): Promise<string> {
  const uid = auth.currentUser!.uid;
  const ref = doc(db, 'sessions', cryptoRandomId());
  await setDoc(ref, {
    status: 'setup',
    name: opts.name,
    hostUid: uid,
    hostName: opts.hostName,
    iban: opts.iban,
    currency: 'EUR',
    billTotalCents: 0,
    itemCount: 0,
    createdAt: serverTimestamp(),
    closedAt: null,
    expireAt: ttl(),
  });
  return ref.id;
}

/** 20-char Firestore-style id, generated client side so we can build the URL synchronously. */
function cryptoRandomId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return [...bytes].map((b) => chars[b % chars.length]).join('');
}

export async function writeExtractedItems(sessionId: string, items: NewItem[]): Promise<void> {
  const batch = writeBatch(db);
  items.forEach((it, i) => {
    batch.set(doc(itemsRef(sessionId)), {
      name: it.name,
      unitPriceCents: it.unitPriceCents,
      qty: it.qty,
      sharedQty: 0,
      claims: {},
      claimedQty: 0,
      lowConfidence: it.lowConfidence ?? false,
      order: i,
      expireAt: ttl(),
    });
  });
  await batch.commit();
}

export async function addItem(sessionId: string, item: NewItem, order: number): Promise<void> {
  await setDoc(doc(itemsRef(sessionId)), {
    name: item.name,
    unitPriceCents: item.unitPriceCents,
    qty: item.qty,
    sharedQty: 0,
    claims: {},
    claimedQty: 0,
    lowConfidence: false,
    order,
    expireAt: ttl(),
  });
}

export async function updateItem(
  sessionId: string,
  itemId: string,
  fields: Partial<{ name: string; unitPriceCents: number; qty: number }>,
): Promise<void> {
  await updateDoc(itemRef(sessionId, itemId), fields);
}

export async function deleteItem(sessionId: string, itemId: string): Promise<void> {
  await deleteDoc(itemRef(sessionId, itemId));
}

export async function updateSessionFields(
  sessionId: string,
  fields: Partial<{ name: string; hostName: string; iban: string; billTotalCents: number; itemCount: number }>,
): Promise<void> {
  await updateDoc(sessionRef(sessionId), fields);
}

/** setup → open, then the host joins their own session as a participant. */
export async function openSession(
  sessionId: string,
  hostName: string,
  denorm: { billTotalCents: number; itemCount: number },
): Promise<void> {
  await updateDoc(sessionRef(sessionId), { status: 'open', ...denorm });
  await joinSession(sessionId, hostName, auth.currentUser!.uid);
}

export async function joinSession(sessionId: string, displayName: string, pid?: string): Promise<void> {
  const uid = pid ?? auth.currentUser!.uid;
  await setDoc(participantRef(sessionId, uid), {
    displayName,
    isManual: false,
    joinedAt: serverTimestamp(),
    owedCents: null,
    paid: false,
    paidAt: null,
    expireAt: ttl(),
  });
  localStorage.setItem(`billsplit:${sessionId}:name`, displayName);
  saveProfile({ name: displayName });
}

export async function addManualParticipant(sessionId: string, displayName: string): Promise<string> {
  const id = `manual-${cryptoRandomId().slice(0, 12)}`;
  await setDoc(participantRef(sessionId, id), {
    displayName,
    isManual: true,
    joinedAt: serverTimestamp(),
    owedCents: null,
    paid: false,
    paidAt: null,
    expireAt: ttl(),
  });
  return id;
}

/**
 * Race-safe claim: a single-item transaction recomputes availability and the
 * denormalized counter. Losing the race on the last unit throws NoneLeftError
 * so the UI can toast "Someone just took the last one".
 */
export async function setClaim(sessionId: string, itemId: string, participantId: string, desiredQty: number): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(itemRef(sessionId, itemId));
    const it = snap.data();
    if (!it) throw new Error('Item is gone');
    const mine: number = it.claims?.[participantId] ?? 0;
    const available = it.qty - it.sharedQty - it.claimedQty + mine;
    const target = Math.max(0, desiredQty);
    if (target > available) throw new NoneLeftError();
    tx.update(itemRef(sessionId, itemId), {
      [`claims.${participantId}`]: target,
      claimedQty: it.claimedQty + target - mine,
    });
  });
}

/** Host marks N units of an item as shared-by-all (clamped to what's not directly claimed). */
export async function setSharedQty(sessionId: string, itemId: string, sharedQty: number): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(itemRef(sessionId, itemId));
    const it = snap.data();
    if (!it) throw new Error('Item is gone');
    const clamped = Math.max(0, Math.min(sharedQty, it.qty - it.claimedQty));
    if (clamped < sharedQty) throw new NoneLeftError();
    tx.update(itemRef(sessionId, itemId), { sharedQty: clamped });
  });
}

/** Host closes: one batch writes status + every participant's frozen owedCents. */
export async function closeSession(sessionId: string, owed: Map<string, number>): Promise<void> {
  const batch = writeBatch(db);
  batch.update(sessionRef(sessionId), { status: 'closed', closedAt: serverTimestamp() });
  for (const [pid, cents] of owed) {
    batch.update(participantRef(sessionId, pid), { owedCents: cents });
  }
  await batch.commit();
}

export async function markPaid(sessionId: string, pid: string, paid: boolean): Promise<void> {
  await updateDoc(participantRef(sessionId, pid), { paid, paidAt: paid ? serverTimestamp() : null });
}

export async function markSettled(sessionId: string): Promise<void> {
  await updateDoc(sessionRef(sessionId), { status: 'settled' });
}
