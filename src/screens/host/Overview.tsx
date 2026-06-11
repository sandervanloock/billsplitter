import { useState } from 'react';
import { Avatar } from '../../components/Avatar';
import { useToast } from '../../components/Toast';
import { closeSession } from '../../lib/claims';
import type { Item, Participant, Session } from '../../lib/model';
import { formatCents } from '../../lib/money';
import { allAssigned, assignedCents, computeOwed, itemsTotalCents, sharedPoolCents, splitOrder } from '../../lib/totals';

/** H5 — exact-equality assignment check, per-person totals, close. */
export function Overview({
  session,
  items,
  participants,
  onBack,
}: {
  session: Session;
  items: Item[];
  participants: Participant[];
  onBack: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const total = itemsTotalCents(items);
  const assigned = assignedCents(items);
  const done = allAssigned(items);
  const ordered = splitOrder(participants);
  const owed = computeOwed(items, participants);
  const pool = sharedPoolCents(items);

  async function close() {
    setBusy(true);
    try {
      await closeSession(session.id, owed);
    } catch (err) {
      toast((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="scr">
      <div className="appbar">
        <button type="button" className="back" onClick={onBack}>
          ‹
        </button>
        <h3>Overview</h3>
        <span className="step">Step 5/5</span>
      </div>

      {done ? (
        <div className="banner ok">
          <span>✓</span>
          <div>
            <div className="h-sm" style={{ color: 'var(--ok)' }}>
              All items assigned
            </div>
            <span className="muted">
              {formatCents(assigned)} of {formatCents(total)}
            </span>
          </div>
        </div>
      ) : (
        <div className="banner warn">
          <span>⚠</span>
          <div>
            <div className="h-sm" style={{ color: 'var(--accent)' }}>
              {formatCents(total - assigned)} still unassigned
            </div>
            <span className="muted" style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={onBack}>
              {formatCents(assigned)} of {formatCents(total)} — go back to fill the gaps
            </span>
          </div>
        </div>
      )}

      <div className="label">Per person</div>
      <div className="box" style={{ padding: '4px 12px' }}>
        {ordered.map((p, i) => (
          <div className="item" key={p.id}>
            <Avatar name={p.displayName} index={i} />
            <span className="nm">
              {p.displayName}
              {p.id === session.hostUid && <span className="muted"> host</span>}
            </span>
            <span className="pr">{formatCents(owed.get(p.id) ?? 0, false)}</span>
          </div>
        ))}
      </div>

      <div
        className="box"
        style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--accent-soft)' }}
      >
        <span style={{ color: 'var(--accent)' }}>💧 Shared pool ÷{participants.length || 1}</span>
        <span className="h-sm" style={{ color: 'var(--accent)' }}>
          {formatCents(pool)}
        </span>
      </div>

      <div className="grow" />
      <span className="muted center">Closing locks everyone’s picks and shows them a payment QR</span>
      <button type="button" className="btn accent full hot" disabled={!done || busy} onClick={close}>
        Close session →
      </button>
    </div>
  );
}
