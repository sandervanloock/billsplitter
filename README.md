# BillSplit 🧾

Split a restaurant bill in one evening: the **host** photographs the bill, AI
(Gemini 2.5 Flash-Lite) extracts the line items, friends join via a WhatsApp
link with just a name (no signup), claim what they had **in real time**, and
after the host closes everyone repays via an **EPC QR code** (scannable by
every Belgian banking app — KBC, ING, Belfius, BNP, Argenta, bunq).

Stack: React + Vite SPA · Firebase Hosting · Firestore (realtime + anonymous
auth + capability URLs) · one Cloud Function (2nd gen, `europe-west1`) for the
WhatsApp link preview + server-side Gemini calls. Designed to run at ≈ €0–1/month.

## Local development

No cloud project needed — everything runs on the emulators, and the bill
extractor returns a canned fixture (`MOCK_EXTRACT`, automatic in the emulator
when no Gemini key is set).

```bash
npm install
npm --prefix functions install

npm run emulators     # terminal 1: auth + firestore + functions (+ hosting)
npm run dev           # terminal 2: vite on http://localhost:5173
npm run seed          # terminal 3 (optional): demo session, prints host+join URLs
```

Two roles side by side: open the host URL in a normal window and the join URL
in an **incognito window** — each browser profile gets its own anonymous user.
The join screen also has a dev-only "＋ new persona" button. The seed's host
URL uses `?dev-uid=seed-host`, which only works against the auth emulator.

## Tests

```bash
npm test              # unit: money math, largest-remainder split, EPC payload, IBAN
npm run test:rules    # firestore.rules suite against the emulator (22 cases)
npm run e2e           # Playwright: host + participant in two browser contexts
```

## Deploying for real

1. Create a Firebase project (Blaze plan) + a Web App; put its config in
   `.env.production` (values from Firebase console → Project settings → Web app)
   and the project id in `.firebaserc`:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project
   VITE_FIREBASE_APP_ID=...
   ```
   (`VITE_USE_EMULATORS=1` points any build back at the local emulators.)
2. Enable **Anonymous** sign-in (Authentication → Sign-in method) and create a
   **Firestore** database (eur3 or europe-west1).
3. Gemini key: `firebase functions:secrets:set GEMINI_API_KEY` (key from AI Studio).
4. `npm run build && firebase deploy`
5. **TTL policies** (deletes expired sessions; policies don't cascade, so all three):
   ```bash
   gcloud firestore fields ttls update expireAt --collection-group=sessions     --enable-ttl
   gcloud firestore fields ttls update expireAt --collection-group=items        --enable-ttl
   gcloud firestore fields ttls update expireAt --collection-group=participants --enable-ttl
   ```
6. Set a GCP **budget alert** (e.g. €5) on the project.
7. Verify: share `/j/{id}` into WhatsApp → preview card with session name +
   total; scan a payment QR with a real banking app against the host IBAN.

The Gemini model is pinned in `functions/src/index.ts` (`GEMINI_MODEL` env var
to override) — swap it there when Google retires 2.5 Flash-Lite.

## How money stays exact

All amounts are integer cents. Direct claims are exact; the shared-by-all pool
is split with largest remainder, ordered by join time, so every client shows
identical numbers and Σ owed == bill total to the cent. Claims are race-safe
single-item transactions; the security rules verify the claimed-quantity
counter arithmetic on every write, so a malicious participant can't over-claim
or touch anyone else's picks. Sessions can never be listed — the random 20-char
session id in the URL *is* the access token.

Design reference lives in `design/` (`billsplit-handoff.zip`).
