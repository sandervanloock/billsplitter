import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Check, CopyField, Qty } from '../components/controls';
import { QR } from '../components/QR';
import { useToast } from '../components/Toast';
import { markPaid, NoneLeftError, setClaim } from '../lib/claims';
import { useAuthUser, useItems, useParticipants, useSession } from '../lib/hooks';
import type { Item, Participant, Session } from '../lib/model';
import { formatCents, formatIban } from '../lib/money';
import { epcPayloadFor, paymentReference } from '../lib/payment';
import { shareText } from '../lib/share';
import { usePageTitle } from '../lib/title';
import { computeOwed, mySharedShareCents } from '../lib/totals';
import { Gone, Loading } from './host/HostScreen';

export function ParticipantScreen() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthUser();
  const session = useSession(id, !!user);
  const items = useItems(id, !!user);
  const participants = useParticipants(id, !!user);
  const [doneLocal, setDoneLocal] = useState(() => localStorage.getItem(`billsplit:${id}:done`) === '1');
  usePageTitle(session?.name);

  if (!user || session === undefined) return <Loading />;
  if (session === null) return <Gone />;
  if (items === undefined || participants === undefined) return <Loading />;

  const me = participants.find((p) => p.id === user.uid);
  if (!me) return <Navigate to={`/join/${id}`} replace />;

  const setDone = (v: boolean) => {
    localStorage.setItem(`billsplit:${id}:done`, v ? '1' : '0');
    setDoneLocal(v);
  };

  if (session.status === 'open' || session.status === 'setup') {
    return doneLocal ? (
      <Waiting session={session} items={items} participants={participants} me={me} onEdit={() => setDone(false)} />
    ) : (
      <Pick session={session} items={items} participants={participants} me={me} onDone={() => setDone(true)} />
    );
  }
  // closed or settled — owedCents is frozen on my participant doc
  if (me.paid || (me.owedCents ?? 0) === 0) {
    return <Done session={session} items={items} participants={participants} me={me} />;
  }
  return <Pay session={session} items={items} participants={participants} me={me} />;
}

/** Direct picks + shared rows + my running total, shown identically everywhere. */
function MyRecap({ items, participants, me }: { items: Item[]; participants: Participant[]; me: Participant }) {
  const myItems = items.filter((it) => (it.claims[me.id] ?? 0) > 0);
  const share = mySharedShareCents(items, participants, me.id);
  const total = me.owedCents ?? computeOwed(items, participants).get(me.id) ?? 0;
  return (
    <div className="box" style={{ padding: '4px 12px' }}>
      {myItems.map((it) => {
        const n = it.claims[me.id] ?? 0;
        return (
          <div className="item" key={it.id}>
            <span className="nm">
              {it.name}
              {n > 1 ? ` ×${n}` : ''}
            </span>
            <span className="pr">{formatCents(n * it.unitPriceCents, false)}</span>
          </div>
        );
      })}
      {share > 0 && (
        <div className="item">
          <span className="nm">Shared ÷{participants.length}</span>
          <span className="pr">{formatCents(share, false)}</span>
        </div>
      )}
      <div className="item">
        <span className="nm" style={{ fontWeight: 600 }}>
          Your share
        </span>
        <span className="pr" style={{ fontWeight: 700, color: 'var(--ink)' }}>
          {formatCents(total)}
        </span>
      </div>
    </div>
  );
}

/** P2 — live bill, claim what you had. */
function Pick({
  session,
  items,
  participants,
  me,
  onDone,
}: {
  session: Session;
  items: Item[];
  participants: Participant[];
  me: Participant;
  onDone: () => void;
}) {
  const toast = useToast();
  const sharedItems = items.filter((it) => it.sharedQty > 0);
  const claimable = items.filter((it) => it.qty - it.sharedQty > 0);
  const myShare = mySharedShareCents(items, participants, me.id);
  const myTotal = computeOwed(items, participants).get(me.id) ?? 0;

  async function claim(item: Item, qty: number) {
    try {
      await setClaim(session.id, item.id, me.id, qty);
    } catch (err) {
      toast(err instanceof NoneLeftError ? 'Someone just took the last one' : (err as Error).message);
    }
  }

  return (
    <div className="scr">
      <div className="appbar">
        <h3>Hi {me.displayName} 👋</h3>
        <span className="step">pick yours</span>
      </div>

      <div className="label">The bill — tap what you had</div>
      <div className="box" data-testid="bill-list" style={{ padding: '2px 12px' }}>
        {claimable.map((it) => {
          const mine = it.claims[me.id] ?? 0;
          const left = it.qty - it.sharedQty - it.claimedQty;
          if (it.qty - it.sharedQty === 1) {
            const takenByOther = mine === 0 && left === 0;
            return (
              <div className="item" key={it.id} style={takenByOther ? { opacity: 0.5 } : undefined}>
                <Check on={mine > 0} disabled={takenByOther} onToggle={() => claim(it, mine > 0 ? 0 : 1)} />
                <span className="nm">
                  {it.name}
                  {takenByOther && <span className="muted"> taken</span>}
                </span>
                <span className="pr">{formatCents(it.unitPriceCents, false)}</span>
              </div>
            );
          }
          return (
            <div className="item" key={it.id}>
              <span className="nm">
                {it.name}{' '}
                <span className="muted">
                  {formatCents(it.unitPriceCents, false)} · {left} left
                </span>
              </span>
              <Qty value={mine} max={mine + left} onChange={(n) => claim(it, n)} />
            </div>
          );
        })}
        {claimable.length === 0 && <div className="item muted">Everything on the bill is shared</div>}
      </div>

      {sharedItems.length > 0 && (
        <>
          <div className="label">Shared by all · split evenly</div>
          <div className="box" style={{ padding: '2px 12px', background: 'var(--accent-soft)' }}>
            {sharedItems.map((it) => (
              <div className="item" key={it.id} style={{ borderColor: 'rgba(216,98,79,.16)' }}>
                <span className="nm">
                  {it.name}
                  {it.sharedQty > 1 ? ` ×${it.sharedQty}` : ''}
                </span>
                <span className="pr">{formatCents(it.sharedQty * it.unitPriceCents, false)}</span>
              </div>
            ))}
            <div className="item" style={{ border: 0 }}>
              <span className="nm" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                Your share · ÷{participants.length}
              </span>
              <span className="pr" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                {formatCents(myShare, false)}
              </span>
            </div>
          </div>
        </>
      )}

      <div className="grow" />
      <div className="box" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="muted">Your share</span>
          <div className="total">
            <span className="big">{formatCents(myTotal)}</span>
          </div>
        </div>
        <button type="button" className="btn accent hot" style={{ padding: '12px 22px' }} onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}

/** P3 — locked in, waiting for the host to close (flips live via the listener). */
function Waiting({
  session,
  items,
  participants,
  me,
  onEdit,
}: {
  session: Session;
  items: Item[];
  participants: Participant[];
  me: Participant;
  onEdit: () => void;
}) {
  return (
    <div className="scr">
      <div className="appbar">
        <button type="button" className="back" onClick={onEdit}>
          ‹
        </button>
        <h3>You’re set</h3>
      </div>
      <div className="center" style={{ marginTop: 8 }}>
        <div className="endcard">
          <div className="big-ic">✅</div>
        </div>
        <div className="h-sm">Items locked in</div>
        <span className="muted">you can still go back and change them until {session.hostName} closes</span>
      </div>
      <MyRecap items={items} participants={participants} me={me} />
      <div className="box dashed" style={{ padding: 12, flexDirection: 'column', gap: 4 }}>
        ⏳ Waiting for {session.hostName} to close
        <span style={{ fontSize: 13 }}>you’ll get a payment QR here</span>
      </div>
      <div className="grow" />
      <div className="foot-hint">leave this open — it updates by itself</div>
    </div>
  );
}

/** P4 — EPC069-12 QR + copyable fallback + self-reported paid. */
function Pay({
  session,
  items,
  participants,
  me,
}: {
  session: Session;
  items: Item[];
  participants: Participant[];
  me: Participant;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const owed = me.owedCents ?? 0;
  const reference = paymentReference(session.name, me.displayName);
  const payload = epcPayloadFor(session, me);

  async function paid() {
    setBusy(true);
    try {
      await markPaid(session.id, me.id, true);
    } catch (err) {
      toast((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="scr">
      <div className="appbar">
        <h3>Pay your share</h3>
        <span className="step">closed</span>
      </div>

      <div className="center" style={{ marginTop: 4 }}>
        <span className="muted">You owe {session.hostName}</span>
        <div style={{ fontSize: 34, fontWeight: 700 }}>{formatCents(owed)}</div>
      </div>

      <QR text={payload} size={150} label="Payment QR" />
      <div className="center muted">
        Scan with your <strong>banking app</strong> (KBC, ING, Belfius…) — a normal camera app won’t recognize it.
      </div>
      <div className="center muted" style={{ fontSize: 13 }}>
        On {session.hostName}’s phone? Ask them to show your QR under <em>Getting paid back</em>.
      </div>

      <CopyField label="To IBAN" value={formatIban(session.iban)} copyValue={session.iban.replace(/\s+/g, '')} />
      <CopyField label="Amount" value={formatCents(owed, false)} />
      <CopyField label="Reference" value={reference} />

      <button
        type="button"
        className="btn ghost full"
        onClick={() =>
          shareText(
            `Pay ${session.hostName} ${formatCents(owed)} for "${session.name}"\nIBAN: ${formatIban(session.iban)}\nReference: ${reference}`,
          )
        }
      >
        Share payment details
      </button>

      <details>
        <summary className="muted" style={{ cursor: 'pointer' }}>
          What did I have again?
        </summary>
        <MyRecap items={items} participants={participants} me={me} />
      </details>

      <div className="grow" />
      <button type="button" className="btn ghost full hot" disabled={busy} onClick={paid}>
        I’ve paid ✓
      </button>
    </div>
  );
}

/** P5 — settled. */
function Done({
  session,
  items,
  participants,
  me,
}: {
  session: Session;
  items: Item[];
  participants: Participant[];
  me: Participant;
}) {
  const owed = me.owedCents ?? 0;
  return (
    <div className="scr">
      <div className="appbar">
        <h3>All done</h3>
      </div>
      <div className="center" style={{ marginTop: 10 }}>
        <div className="big-ic" style={{ fontSize: 36 }}>
          🎉
        </div>
        <div className="h-sm" style={{ marginTop: 4 }}>
          {owed > 0 ? `Paid ${formatCents(owed)} to ${session.hostName}` : 'Nothing to pay'}
        </div>
        <span className="muted">{session.name} · settled</span>
      </div>
      {owed > 0 && (
        <div className="banner ok" style={{ justifyContent: 'space-between' }}>
          <span className="h-sm" style={{ color: 'var(--ok)' }}>
            Payment sent
          </span>
          <span className="tag" style={{ background: '#fff', color: 'var(--ok)' }}>
            ✓ paid
          </span>
        </div>
      )}
      <MyRecap items={items} participants={participants} me={me} />
      <div className="grow" />
      <div className="endcard">
        <span className="muted">you can close this tab now</span>
      </div>
    </div>
  );
}
