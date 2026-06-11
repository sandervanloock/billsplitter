/**
 * Seed a demo session against the local emulators and print the URLs.
 *
 *   firebase emulators:start          (terminal 1)
 *   npm run dev                       (terminal 2)
 *   npm run seed                      (terminal 3)
 *
 * Walks the real client flow (rules enforced): host creates + opens the session,
 * Maya and Jonas join anonymously and claim items, Ana is added manually,
 * bread + water are marked shared-by-all.
 */
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously, signInWithCustomToken, signOut } from 'firebase/auth';
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getFirestore,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';

const app = initializeApp({ projectId: 'demo-billsplit', apiKey: 'demo-api-key' });
const auth = getAuth(app);
const db = getFirestore(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(db, '127.0.0.1', 8080);

const HOST_UID = 'seed-host';
const ttl = () => Timestamp.fromMillis(Date.now() + 7 * 24 * 3600 * 1000);

function unsignedToken(uid: string): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({
    iss: 'billsplit-dev',
    sub: 'billsplit-dev',
    aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    uid,
    iat: now,
    exp: now + 3600,
  })}.`;
}

const asHost = () => signInWithCustomToken(auth, unsignedToken(HOST_UID));

const ITEMS: Array<[name: string, unitPriceCents: number, qty: number, lowConfidence?: boolean]> = [
  ['Burger', 1450, 1],
  ['Steak', 2200, 1],
  ['Caesar salad', 1280, 1],
  ['Fries', 410, 2],
  ['Coke Zero', 320, 3, true],
  ['Water 1L', 200, 4],
  ['Bread basket', 220, 1],
  ['Wine (glass)', 600, 2],
  ['Espresso', 250, 2],
  ['Tiramisu', 650, 1],
];
const TOTAL = ITEMS.reduce((s, [, p, q]) => s + p * q, 0);

async function join(displayName: string) {
  const uid = auth.currentUser!.uid;
  await setDoc(doc(db, 'sessions', SID, 'participants', uid), {
    displayName,
    isManual: false,
    joinedAt: serverTimestamp(),
    owedCents: null,
    paid: false,
    paidAt: null,
    expireAt: ttl(),
  });
  return uid;
}

async function claim(itemId: string, qty: number, prevClaimed = 0) {
  const uid = auth.currentUser!.uid;
  await updateDoc(doc(db, 'sessions', SID, 'items', itemId), {
    [`claims.${uid}`]: qty,
    claimedQty: prevClaimed + qty,
  });
}

const SID = `seed${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
const itemIds = new Map<string, string>();

await asHost();
await setDoc(doc(db, 'sessions', SID), {
  status: 'setup',
  name: 'Friday @ Bellini',
  hostUid: HOST_UID,
  hostName: 'Sam',
  iban: 'BE68539007547034',
  currency: 'EUR',
  billTotalCents: TOTAL,
  itemCount: ITEMS.length,
  createdAt: serverTimestamp(),
  closedAt: null,
  expireAt: ttl(),
});
for (const [i, [name, unitPriceCents, qty, lowConfidence]] of ITEMS.entries()) {
  const ref = doc(collection(db, 'sessions', SID, 'items'));
  itemIds.set(name, ref.id);
  await setDoc(ref, {
    name,
    unitPriceCents,
    qty,
    sharedQty: 0,
    claims: {},
    claimedQty: 0,
    lowConfidence: lowConfidence ?? false,
    order: i,
    expireAt: ttl(),
  });
}
await updateDoc(doc(db, 'sessions', SID), { status: 'open' });
await join('Sam');
// shared by the table: the bread basket + 2 of the 4 waters
await updateDoc(doc(db, 'sessions', SID, 'items', itemIds.get('Bread basket')!), { sharedQty: 1 });
await updateDoc(doc(db, 'sessions', SID, 'items', itemIds.get('Water 1L')!), { sharedQty: 2 });

await signOut(auth);
await signInAnonymously(auth);
await join('Maya');
await claim(itemIds.get('Burger')!, 1);
await claim(itemIds.get('Wine (glass)')!, 1);

await signOut(auth);
await signInAnonymously(auth);
await join('Jonas');
await claim(itemIds.get('Espresso')!, 2);

await asHost();
await setDoc(doc(db, 'sessions', SID, 'participants', 'manual-ana'), {
  displayName: 'Ana',
  isManual: true,
  joinedAt: serverTimestamp(),
  owedCents: null,
  paid: false,
  paidAt: null,
  expireAt: ttl(),
});

console.log(`
🌱 Seeded "Friday @ Bellini" — €${(TOTAL / 100).toFixed(2)}, ${ITEMS.length} items
   participants: Sam (host) · Maya · Jonas · Ana (manual)

   Host view:        http://localhost:5173/s/${SID}?dev-uid=${HOST_UID}
   Participant join: http://localhost:5173/join/${SID}

   (open the join link in an incognito window to get a fresh persona)
`);
process.exit(0);
