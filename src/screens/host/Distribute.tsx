import { useState } from 'react';
import { Avatar } from '../../components/Avatar';
import { Check, Qty } from '../../components/controls';
import { useToast } from '../../components/Toast';
import { addManualParticipant, NoneLeftError, setClaim, setSharedQty } from '../../lib/claims';
import type { Item, Participant, Session } from '../../lib/model';
import { formatCents } from '../../lib/money';
import { computeOwed, directCents, sharedPoolCents, splitOrder } from '../../lib/totals';

/** H4 — host marks shared-by-all items, watches per-person totals, picks on behalf. */
export function Distribute({
  session,
  items,
  participants,
  onBack,
  onNext,
}: {
  session: Session;
  items: Item[];
  participants: Participant[];
  onBack: () => void;
  onNext: () => void;
}) {
  const toast = useToast();
  const [pickFor, setPickFor] = useState<string | null>(null);
  const [addingPerson, setAddingPerson] = useState(false);
  const [newName, setNewName] = useState('');

  const ordered = splitOrder(participants);
  const owed = computeOwed(items, participants);
  const pool = sharedPoolCents(items);

  if (pickFor) {
    return (
      <PickOnBehalf
        session={session}
        items={items}
        participants={ordered}
        pickFor={pickFor}
        onSwitch={setPickFor}
        onClose={() => setPickFor(null)}
      />
    );
  }

  async function toggleShared(item: Item, next: number) {
    try {
      await setSharedQty(session.id, item.id, next);
    } catch (err) {
      toast(err instanceof NoneLeftError ? 'Those units are already claimed' : (err as Error).message);
    }
  }

  return (
    <div className="scr">
      <div className="appbar">
        <button type="button" className="back" onClick={onBack}>
          ‹
        </button>
        <h3>Shared items</h3>
        <span className="step">Step 4/5</span>
      </div>

      <div className="banner warn">
        <span style={{ fontSize: 15 }}>💡</span>
        <div>
          <div className="h-sm" style={{ color: 'var(--accent)' }}>
            Everyone picks their own
          </div>
          <span className="muted">You just set what was shared by all</span>
        </div>
      </div>

      <div className="label">What did the table share? · split ÷{participants.length || 1}</div>
      <div className="box" data-testid="shared-list" style={{ padding: '2px 12px' }}>
        {items.map((it) =>
          it.qty === 1 ? (
            <div className={`item ${it.sharedQty > 0 ? 'shared' : ''}`} key={it.id}>
              <Check on={it.sharedQty > 0} onToggle={() => toggleShared(it, it.sharedQty > 0 ? 0 : 1)} />
              <span className="nm">{it.name}</span>
              <span className="pr">{formatCents(it.unitPriceCents, false)}</span>
            </div>
          ) : (
            <div className={`item ${it.sharedQty > 0 ? 'shared' : ''}`} key={it.id}>
              <span className="nm">
                {it.name} <span className="muted">{formatCents(it.unitPriceCents, false)} ea · {it.qty}</span>
              </span>
              <Qty value={it.sharedQty} max={it.qty - it.claimedQty} onChange={(n) => toggleShared(it, n)} />
            </div>
          ),
        )}
      </div>

      <div
        className="box"
        style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--accent-soft)' }}
      >
        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>💧 Shared total</span>
        <span className="h-sm" style={{ color: 'var(--accent)' }}>
          {formatCents(pool)}
        </span>
      </div>

      <div className="divider" />
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="label">Participants</span>
        <span className="muted">tap to edit their items</span>
      </div>
      <div className="box" data-testid="people-list" style={{ padding: '4px 12px' }}>
        {ordered.map((p, i) => (
          <div className="item" key={p.id} style={{ cursor: 'pointer' }} onClick={() => setPickFor(p.id)}>
            <Avatar name={p.displayName} index={i} />
            <span className="nm">
              {p.displayName}
              {p.id === session.hostUid && <span className="muted"> you</span>}
              {directCents(items, p.id) === 0 && p.id !== session.hostUid && (
                <span style={{ color: 'var(--accent)' }}> not started</span>
              )}
            </span>
            <span className="pr">{formatCents(owed.get(p.id) ?? 0)} ›</span>
          </div>
        ))}
      </div>

      {addingPerson ? (
        <div className="field" style={{ gap: 6 }}>
          <input autoFocus placeholder="Their name (e.g. Ana)" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ flex: 1 }} />
          <button
            type="button"
            className="btn sm accent"
            onClick={async () => {
              if (!newName.trim()) return;
              try {
                await addManualParticipant(session.id, newName.trim());
                setNewName('');
                setAddingPerson(false);
              } catch (err) {
                toast((err as Error).message);
              }
            }}
          >
            Add
          </button>
        </div>
      ) : (
        <button type="button" className="btn ghost full" onClick={() => setAddingPerson(true)}>
          + Add participant manually
        </button>
      )}

      <div className="grow" />
      <button type="button" className="btn accent full hot" onClick={onNext}>
        Review &amp; close →
      </button>
    </div>
  );
}

/** H4b — claim items for someone who isn't on their phone (e.g. manually-added Ana). */
function PickOnBehalf({
  session,
  items,
  participants,
  pickFor,
  onSwitch,
  onClose,
}: {
  session: Session;
  items: Item[];
  participants: Participant[];
  pickFor: string;
  onSwitch: (pid: string) => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const person = participants.find((p) => p.id === pickFor);
  const name = person?.displayName ?? '?';

  async function claim(item: Item, qty: number) {
    try {
      await setClaim(session.id, item.id, pickFor, qty);
    } catch (err) {
      toast(err instanceof NoneLeftError ? 'Someone just took the last one' : (err as Error).message);
    }
  }

  return (
    <div className="scr">
      <div className="appbar">
        <button type="button" className="back" onClick={onClose}>
          ‹
        </button>
        <h3>Pick for {name}</h3>
        <span className="step">on their behalf</span>
      </div>

      <div className="label">Picking for</div>
      <div className="row" style={{ flexWrap: 'wrap', gap: 7 }}>
        {participants.map((p, i) => (
          <button type="button" key={p.id} className={`chip ${p.id === pickFor ? 'on' : 'av'}`} onClick={() => onSwitch(p.id)}>
            <Avatar name={p.displayName} index={i} small />
            {p.displayName}
          </button>
        ))}
      </div>

      <div className="label">Tap what {name} had</div>
      <div className="box" style={{ padding: '2px 12px' }}>
        {items.map((it) => {
          const mine = it.claims[pickFor] ?? 0;
          const left = it.qty - it.sharedQty - it.claimedQty;
          if (it.qty === 1 && it.sharedQty === 0) {
            return (
              <div className="item" key={it.id}>
                <Check on={mine > 0} disabled={mine === 0 && left === 0} onToggle={() => claim(it, mine > 0 ? 0 : 1)} />
                <span className="nm">{it.name}</span>
                <span className="pr">{formatCents(it.unitPriceCents, false)}</span>
              </div>
            );
          }
          if (it.qty === it.sharedQty) {
            return (
              <div className="item" key={it.id} style={{ opacity: 0.55 }}>
                <span className="nm">
                  {it.name} <span className="muted">shared by all</span>
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
      </div>

      <div className="grow" />
      <div className="box" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="muted">{name}’s items</span>
          <div className="total">
            <span className="big">{formatCents(directCents(items, pickFor))}</span>
          </div>
        </div>
        <button type="button" className="btn accent" style={{ padding: '10px 18px' }} onClick={onClose}>
          Save
        </button>
      </div>
    </div>
  );
}
