# CLAUDE.md

BillSplit: host photographs a restaurant bill, Gemini extracts line items, friends
join via a capability URL with just a name (anonymous Firebase auth, no signup),
claim items in real time, and repay the host via an EPC069-12 QR code after close.
React + Vite SPA · Firestore · one Cloud Function (2nd gen, europe-west1).

## Commands

```bash
npm run dev           # vite on :5173 (proxies /api and /j/* to the functions emulator)
npm run emulators     # firebase emulators: auth :9099, firestore :8080, functions :5001
npm run seed          # demo session against emulators; prints host (?dev-uid=) + join URLs
npm test              # vitest unit tests (src/**/*.test.ts)
npm run test:rules    # firestore.rules suite (needs emulator; wraps emulators:exec)
npm run e2e           # Playwright two-context e2e (boots emulators + vite itself)
npm run build         # tsc -b && vite build
npm --prefix functions run build   # compile the Cloud Function
```

Machine quirks: run installs with `npm install --cache "$TMPDIR/npm-cache"` (the
default npm cache has root-owned files → EPERM). Emulators/vite can't bind ports
inside the sandbox. If port 8080 is taken after a Playwright run, kill the stale
java process: `lsof -ti :8080 | xargs kill`.

## Architecture

- `src/lib/money.ts` — pure: integer-cents math, largest-remainder split, EPC QR
  payload + charset sanitizer, IBAN mod-97. No Firebase imports; unit-tested.
- `src/lib/totals.ts` — pure per-person totals: direct claims + shared-pool share.
  Split order = joinedAt then id, so every client renders identical cents.
- `src/lib/model.ts` — plain TS shapes (Session/Item/Participant), no Firebase.
- `src/lib/fb.ts` — doc refs + snapshot→model mappers (`serverTimestamps: 'estimate'`).
- `src/lib/claims.ts` — all writes: createSession, joinSession, setClaim (race-safe
  single-item transaction, throws `NoneLeftError` on losing the last unit),
  setSharedQty, closeSession (one batch: status + every owedCents), markPaid.
- `src/lib/hooks.ts` — `useSession/useItems/useParticipants` onSnapshot hooks;
  undefined = loading, null = missing.
- `src/screens/` — `Create` (H1) · `host/` HostScreen dispatches by `session.status`
  (setup→ReviewItems, open→Share/Distribute/Overview by local step, closed→Collect)
  · `Join` (P1) · `Participant` (P2–P5, flips screens automatically via listeners).
- `functions/src/index.ts` — one Express app behind function `app`:
  `GET /j/:id` (OG tags for WhatsApp's no-JS crawler + redirect to `/join/:id`),
  `POST /api/extract` (verifies anonymous ID token, calls Gemini with JSON schema).
  Mock bill (`mockBill.ts`) is returned when `MOCK_EXTRACT=1` or in the emulator
  without a key. Gemini model pinned here (`GEMINI_MODEL` env to override).
- `firestore.rules` — the trust model; mirror any data-shape change here AND in
  `rules-tests/firestore.rules.test.ts`.

## Invariants — do not break

- **All money is integer cents.** Σ owedCents == items total, exactly, when all
  items are assigned. Never use floats for amounts.
- **Claims live on the item doc** (`claims: {pid: qty}` + denormalized `claimedQty`)
  because web-SDK transactions can't run queries. Rules verify the counter delta
  on every participant write; participants may touch only their own claims key.
- **Sessions are never listable** — the random 20-char id is the access token.
  Don't add any rule granting `list` on sessions.
- **Close = one batch** (session status + all owedCents); rules authorize the
  participant writes via `getAfter()` on the session. Don't split this batch.
- **÷N is computed on read while open, frozen into owedCents at close.**
- `expireAt` is stamped on all three doc types (TTL policies don't cascade) and
  is immutable after create.

## Conventions

- Design reference: `design/billsplit/project/Bill Split - Clickthrough.html`.
  Its phone bezel/statusbar/chooser are prototype chrome — never build those.
  Styling comes from `src/styles/tokens.css` (component classes lifted from the
  prototype); prefer those classes over new inline styles.
- Vitest configs are split: unit tests in `vite.config.ts`, rules tests in
  `vitest.rules.config.ts` (rules tests must not run in the default `npm test`).
- The seed script can't import from `src/` (import.meta.env is Vite-only); it
  duplicates writes intentionally.
- Local dev project id is `demo-billsplit` (offline demo project). Production
  config comes from `.env.production` (`VITE_FIREBASE_*`); deploy steps incl.
  the three TTL policies are in README.md.
