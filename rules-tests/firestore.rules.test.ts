import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { Timestamp, deleteField, doc, getDoc, getDocs, collection, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

let env: RulesTestEnvironment;

const SID = 'session-abc';
const HOST = 'host-uid';
const ALICE = 'alice-uid';
const BOB = 'bob-uid';
const ANA = 'manual-ana'; // manual participant, no auth account

const expireAt = Timestamp.fromMillis(Date.now() + 7 * 24 * 3600 * 1000);

function sessionDoc(overrides: Record<string, unknown> = {}) {
  return {
    status: 'open',
    name: 'Friday @ Bellini',
    hostUid: HOST,
    hostName: 'Sam',
    iban: 'BE68539007547034',
    currency: 'EUR',
    billTotalCents: 7240,
    itemCount: 2,
    createdAt: Timestamp.now(),
    closedAt: null,
    expireAt,
    ...overrides,
  };
}
function itemDoc(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Wine',
    unitPriceCents: 600,
    qty: 3,
    sharedQty: 0,
    claims: {},
    claimedQty: 0,
    lowConfidence: false,
    order: 0,
    expireAt,
    ...overrides,
  };
}
function participantDoc(overrides: Record<string, unknown> = {}) {
  return {
    displayName: 'Alice',
    isManual: false,
    joinedAt: Timestamp.now(),
    owedCents: null,
    paid: false,
    paidAt: null,
    expireAt,
    ...overrides,
  };
}

/** Seed a session bypassing rules. */
async function seed(opts: { status?: string; items?: Record<string, unknown>; participants?: Record<string, unknown> } = {}) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'sessions', SID), sessionDoc({ status: opts.status ?? 'open' }));
    for (const [id, data] of Object.entries(opts.items ?? { wine: itemDoc() })) {
      await setDoc(doc(db, 'sessions', SID, 'items', id), data as object);
    }
    const defaults = {
      [ALICE]: participantDoc(),
      [BOB]: participantDoc({ displayName: 'Bob' }),
      [ANA]: participantDoc({ displayName: 'Ana', isManual: true }),
    };
    for (const [id, data] of Object.entries(opts.participants ?? defaults)) {
      await setDoc(doc(db, 'sessions', SID, 'participants', id), data as object);
    }
  });
}

const asHost = () => env.authenticatedContext(HOST).firestore();
const asAlice = () => env.authenticatedContext(ALICE).firestore();
const asBob = () => env.authenticatedContext(BOB).firestore();
const asStranger = () => env.authenticatedContext('stranger-uid').firestore();
const asNobody = () => env.unauthenticatedContext().firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-billsplit',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
});

describe('sessions', () => {
  it('signed-in users can get a session by id; anonymous-without-auth cannot', async () => {
    await seed();
    await assertSucceeds(getDoc(doc(asStranger(), 'sessions', SID)));
    await assertFails(getDoc(doc(asNobody(), 'sessions', SID)));
  });

  it('nobody can list sessions (capability URLs stay secret)', async () => {
    await seed();
    await assertFails(getDocs(collection(asHost(), 'sessions')));
  });

  it('a user can create a session only with their own uid as host, status setup', async () => {
    const db = asHost();
    await assertSucceeds(setDoc(doc(db, 'sessions', 'new1'), sessionDoc({ status: 'setup' })));
    await assertFails(setDoc(doc(db, 'sessions', 'new2'), sessionDoc({ status: 'setup', hostUid: 'someone-else' })));
    await assertFails(setDoc(doc(db, 'sessions', 'new3'), sessionDoc({ status: 'open' })));
    await assertFails(
      setDoc(doc(db, 'sessions', 'new4'), sessionDoc({ status: 'setup', expireAt: Timestamp.fromMillis(Date.now() + 365 * 24 * 3600 * 1000) })),
    );
  });

  it('only the host can advance status, and only forward', async () => {
    await seed({ status: 'open' });
    await assertFails(updateDoc(doc(asAlice(), 'sessions', SID), { status: 'closed' }));
    await assertSucceeds(updateDoc(doc(asHost(), 'sessions', SID), { status: 'closed', closedAt: Timestamp.now() }));
    await assertFails(updateDoc(doc(asHost(), 'sessions', SID), { status: 'open' }));
    await assertFails(updateDoc(doc(asHost(), 'sessions', SID), { hostUid: 'other' }));
  });
});

describe('joining', () => {
  it('a signed-in user can join an open session under their own uid', async () => {
    await seed({ participants: {} });
    await assertSucceeds(setDoc(doc(asAlice(), 'sessions', SID, 'participants', ALICE), participantDoc()));
  });

  it('cannot join under someone else’s id, while setup, pre-paid, or with owedCents', async () => {
    await seed({ participants: {} });
    await assertFails(setDoc(doc(asAlice(), 'sessions', SID, 'participants', BOB), participantDoc()));
    await assertFails(setDoc(doc(asAlice(), 'sessions', SID, 'participants', ALICE), participantDoc({ paid: true })));
    await assertFails(setDoc(doc(asAlice(), 'sessions', SID, 'participants', ALICE), participantDoc({ owedCents: 0 })));
    await seed({ status: 'setup', participants: {} });
    await assertFails(setDoc(doc(asAlice(), 'sessions', SID, 'participants', ALICE), participantDoc()));
  });

  it('only the host can add manual participants', async () => {
    await seed({ participants: {} });
    await assertSucceeds(setDoc(doc(asHost(), 'sessions', SID, 'participants', 'manual-1'), participantDoc({ displayName: 'Ana', isManual: true })));
    await assertFails(setDoc(doc(asAlice(), 'sessions', SID, 'participants', 'manual-2'), participantDoc({ displayName: 'Eve', isManual: true })));
  });
});

describe('claims', () => {
  it('a participant can claim with an honest counter', async () => {
    await seed();
    await assertSucceeds(
      updateDoc(doc(asAlice(), 'sessions', SID, 'items', 'wine'), { [`claims.${ALICE}`]: 2, claimedQty: 2 }),
    );
  });

  it('rejects a dishonest counter', async () => {
    await seed();
    await assertFails(updateDoc(doc(asAlice(), 'sessions', SID, 'items', 'wine'), { [`claims.${ALICE}`]: 2, claimedQty: 1 }));
    await assertFails(updateDoc(doc(asAlice(), 'sessions', SID, 'items', 'wine'), { [`claims.${ALICE}`]: 2 }));
  });

  it('rejects over-claiming past qty minus shared', async () => {
    await seed({ items: { wine: itemDoc({ qty: 3, sharedQty: 1, claims: { [BOB]: 1 }, claimedQty: 1 }) } });
    // 3 total, 1 shared, Bob has 1 → only 1 left
    await assertFails(updateDoc(doc(asAlice(), 'sessions', SID, 'items', 'wine'), { [`claims.${ALICE}`]: 2, claimedQty: 3 }));
    await assertSucceeds(updateDoc(doc(asAlice(), 'sessions', SID, 'items', 'wine'), { [`claims.${ALICE}`]: 1, claimedQty: 2 }));
  });

  it('rejects touching another participant’s claim or item fields', async () => {
    await seed({ items: { wine: itemDoc({ claims: { [BOB]: 1 }, claimedQty: 1 }) } });
    await assertFails(updateDoc(doc(asAlice(), 'sessions', SID, 'items', 'wine'), { [`claims.${BOB}`]: 0, claimedQty: 0 }));
    await assertFails(
      updateDoc(doc(asAlice(), 'sessions', SID, 'items', 'wine'), { [`claims.${ALICE}`]: 1, claimedQty: 2, unitPriceCents: 1 }),
    );
    await assertFails(updateDoc(doc(asAlice(), 'sessions', SID, 'items', 'wine'), { name: 'Hacked' }));
  });

  it('rejects claims when not a participant or session not open', async () => {
    await seed();
    await assertFails(updateDoc(doc(asStranger(), 'sessions', SID, 'items', 'wine'), { 'claims.stranger-uid': 1, claimedQty: 1 }));
    await seed({ status: 'closed' });
    await assertFails(updateDoc(doc(asAlice(), 'sessions', SID, 'items', 'wine'), { [`claims.${ALICE}`]: 1, claimedQty: 1 }));
  });

  it('a participant can release a claim', async () => {
    await seed({ items: { wine: itemDoc({ claims: { [ALICE]: 2 }, claimedQty: 2 }) } });
    await assertSucceeds(updateDoc(doc(asAlice(), 'sessions', SID, 'items', 'wine'), { [`claims.${ALICE}`]: 0, claimedQty: 0 }));
  });
});

describe('host item management', () => {
  it('host edits items, sets sharedQty, claims on behalf', async () => {
    await seed();
    const db = asHost();
    await assertSucceeds(updateDoc(doc(db, 'sessions', SID, 'items', 'wine'), { name: 'House wine', unitPriceCents: 650 }));
    await assertSucceeds(updateDoc(doc(db, 'sessions', SID, 'items', 'wine'), { sharedQty: 2 }));
    await assertSucceeds(updateDoc(doc(db, 'sessions', SID, 'items', 'wine'), { [`claims.${ANA}`]: 1, claimedQty: 1 }));
    await assertSucceeds(setDoc(doc(db, 'sessions', SID, 'items', 'extra'), itemDoc({ name: 'Espresso', unitPriceCents: 250, qty: 1 })));
  });

  it('host cannot break invariants; non-hosts cannot edit', async () => {
    await seed();
    await assertFails(updateDoc(doc(asHost(), 'sessions', SID, 'items', 'wine'), { sharedQty: 9 })); // > qty
    await assertFails(updateDoc(doc(asHost(), 'sessions', SID, 'items', 'wine'), { unitPriceCents: -1 }));
    await assertFails(updateDoc(doc(asAlice(), 'sessions', SID, 'items', 'wine'), { name: 'Nope' }));
    await seed({ status: 'closed' });
    await assertFails(updateDoc(doc(asHost(), 'sessions', SID, 'items', 'wine'), { name: 'Too late' }));
  });
});

describe('closing the session', () => {
  it('host closes and freezes owedCents in one batch', async () => {
    await seed();
    const db = asHost();
    const batch = writeBatch(db);
    batch.update(doc(db, 'sessions', SID), { status: 'closed', closedAt: Timestamp.now() });
    batch.update(doc(db, 'sessions', SID, 'participants', ALICE), { owedCents: 2205 });
    batch.update(doc(db, 'sessions', SID, 'participants', BOB), { owedCents: 1000 });
    batch.update(doc(db, 'sessions', SID, 'participants', ANA), { owedCents: 1420 });
    await assertSucceeds(batch.commit());
  });

  it('owedCents cannot be written outside a closing batch, nor by participants', async () => {
    await seed();
    await assertFails(updateDoc(doc(asHost(), 'sessions', SID, 'participants', ALICE), { owedCents: 1 }));
    const db = asAlice();
    const batch = writeBatch(db);
    batch.update(doc(db, 'sessions', SID), { status: 'closed' });
    batch.update(doc(db, 'sessions', SID, 'participants', ALICE), { owedCents: 1 });
    await assertFails(batch.commit());
  });
});

describe('paid flags', () => {
  it('after close a participant marks themself paid, nobody else', async () => {
    await seed({ status: 'closed' });
    await assertSucceeds(updateDoc(doc(asAlice(), 'sessions', SID, 'participants', ALICE), { paid: true, paidAt: Timestamp.now() }));
    await assertFails(updateDoc(doc(asAlice(), 'sessions', SID, 'participants', BOB), { paid: true }));
    await assertFails(updateDoc(doc(asAlice(), 'sessions', SID, 'participants', ALICE), { paid: true, owedCents: 0 }));
  });

  it('paid cannot be set while open', async () => {
    await seed();
    await assertFails(updateDoc(doc(asAlice(), 'sessions', SID, 'participants', ALICE), { paid: true }));
  });

  it('host toggles paid only for manual participants', async () => {
    await seed({ status: 'closed' });
    await assertSucceeds(updateDoc(doc(asHost(), 'sessions', SID, 'participants', ANA), { paid: true, paidAt: Timestamp.now() }));
    await assertFails(updateDoc(doc(asHost(), 'sessions', SID, 'participants', ALICE), { paid: true }));
  });
});

describe('misc', () => {
  it('expireAt is immutable on items', async () => {
    await seed();
    await assertFails(
      updateDoc(doc(asHost(), 'sessions', SID, 'items', 'wine'), { expireAt: Timestamp.fromMillis(Date.now() + 999 * 24 * 3600 * 1000) }),
    );
  });

  it('deleteField on own claim key is rejected (claims values must stay ints)', async () => {
    await seed({ items: { wine: itemDoc({ claims: { [ALICE]: 1 }, claimedQty: 1 }) } });
    await assertFails(
      updateDoc(doc(asAlice(), 'sessions', SID, 'items', 'wine'), { [`claims.${ALICE}`]: deleteField(), claimedQty: 0 }),
    );
    expect(true).toBe(true);
  });
});
