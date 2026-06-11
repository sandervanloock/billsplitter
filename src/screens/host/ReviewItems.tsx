import { useState } from 'react';
import { useToast } from '../../components/Toast';
import { addItem, deleteItem, openSession, updateItem, updateSessionFields } from '../../lib/claims';
import type { Item, Session } from '../../lib/model';
import { formatCents, parseEuroToCents } from '../../lib/money';
import { itemsTotalCents } from '../../lib/totals';

/** H2 — inline-editable extracted items, mismatch banner, confirm → open. */
export function ReviewItems({ session, items }: { session: Session; items: Item[] }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);

  const total = itemsTotalCents(items);
  const mismatch = session.billTotalCents > 0 && session.billTotalCents !== total;
  const flagged = items.filter((it) => it.lowConfidence).length;

  async function confirm() {
    setBusy(true);
    try {
      await openSession(session.id, session.hostName, { billTotalCents: total, itemCount: items.length });
    } catch (err) {
      toast((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="scr">
      <div className="appbar">
        <h3>Review items</h3>
        <span className="step">Step 2/5</span>
      </div>

      {items.length > 0 ? (
        <div className="banner ok">
          <span>✓</span>
          <div>
            <div className="h-sm" style={{ color: 'var(--ok)' }}>
              Bill read · {items.length} items
            </div>
            <span className="muted">
              tap a name or price to fix it{flagged > 0 ? ` · ${flagged} flagged ⚠` : ''}
            </span>
          </div>
        </div>
      ) : (
        <div className="banner neutral">
          <span>🧾</span>
          <span className="muted">No items yet — add them below</span>
        </div>
      )}

      <div className="box" style={{ padding: '4px 12px' }}>
        {items.map((it) => (
          <ItemRow key={it.id} sessionId={session.id} item={it} />
        ))}
        {items.length === 0 && <div className="item muted">Nothing here yet</div>}
      </div>

      {adding ? (
        <AddItemRow
          order={items.length}
          sessionId={session.id}
          onDone={() => setAdding(false)}
        />
      ) : (
        <button type="button" className="field" style={{ justifyContent: 'space-between', cursor: 'pointer', width: '100%' }} onClick={() => setAdding(true)}>
          <span className="val">+ Add missing item</span>
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>+</span>
        </button>
      )}

      {mismatch && (
        <div className="banner warn">
          <span>⚠</span>
          <div>
            <div className="h-sm" style={{ color: 'var(--accent)' }}>
              Items add up to {formatCents(total)}, the bill says {formatCents(session.billTotalCents)}
            </div>
            <span className="muted" style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => updateSessionFields(session.id, { billTotalCents: total })}>
              fix an item, or use the items total
            </span>
          </div>
        </div>
      )}

      <div className="grow" />
      <div className="total">
        <span className="muted">Total</span>
        <span className="big">{formatCents(total)}</span>
      </div>
      <button type="button" className="btn accent full hot" disabled={busy || items.length === 0} onClick={confirm}>
        Confirm &amp; share →
      </button>
    </div>
  );
}

function ItemRow({ sessionId, item }: { sessionId: string; item: Item }) {
  const toast = useToast();
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(formatCents(item.unitPriceCents, false));
  const [qty, setQty] = useState(String(item.qty));

  async function save(fields: Partial<{ name: string; unitPriceCents: number; qty: number }>) {
    try {
      await updateItem(sessionId, item.id, { ...fields, ...(item.lowConfidence ? { lowConfidence: false } : {}) } as never);
    } catch (err) {
      toast((err as Error).message);
    }
  }

  return (
    <div
      className="item"
      data-name={item.name}
      style={item.lowConfidence ? { background: 'var(--accent-soft)', margin: '0 -12px', padding: '10px 12px' } : undefined}
    >
      <span className="nm" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <input
          className="ed"
          style={{ border: 0, borderBottom: '1.5px dotted var(--ink-3)', font: 'inherit', background: 'transparent', width: '55%' }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== item.name && save({ name: name.trim() })}
          aria-label="item name"
        />
        {item.lowConfidence && <span style={{ color: 'var(--accent)' }}>⚠</span>}
        <input
          className="ed"
          style={{ border: 0, borderBottom: '1.5px dotted var(--ink-3)', font: 'inherit', background: 'transparent', width: 28, textAlign: 'center' }}
          value={qty}
          inputMode="numeric"
          onChange={(e) => setQty(e.target.value)}
          onBlur={() => {
            const n = Number(qty);
            if (Number.isInteger(n) && n >= 1 && n !== item.qty) save({ qty: n });
            else setQty(String(item.qty));
          }}
          aria-label="quantity"
        />
        <span className="muted">×</span>
      </span>
      <span className="pr">
        <input
          className="ed"
          style={{ border: 0, borderBottom: '1.5px dotted var(--ink-3)', font: 'inherit', background: 'transparent', width: 56, textAlign: 'right' }}
          value={price}
          inputMode="decimal"
          onChange={(e) => setPrice(e.target.value)}
          onBlur={() => {
            const cents = parseEuroToCents(price);
            if (cents != null && cents !== item.unitPriceCents) save({ unitPriceCents: cents });
            else setPrice(formatCents(item.unitPriceCents, false));
          }}
          aria-label="unit price"
        />
      </span>
      <button
        type="button"
        className="edit-ic"
        style={{ background: 'none', border: 0, cursor: 'pointer' }}
        onClick={() => deleteItem(sessionId, item.id)}
        aria-label={`remove ${item.name}`}
      >
        ✕
      </button>
    </div>
  );
}

function AddItemRow({ sessionId, order, onDone }: { sessionId: string; order: number; onDone: () => void }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('1');

  async function add() {
    const cents = parseEuroToCents(price);
    const n = Number(qty);
    if (!name.trim() || cents == null || !Number.isInteger(n) || n < 1) {
      toast('Need a name, a price and a quantity');
      return;
    }
    try {
      await addItem(sessionId, { name: name.trim(), unitPriceCents: cents, qty: n }, order);
      onDone();
    } catch (err) {
      toast((err as Error).message);
    }
  }

  return (
    <div className="field" style={{ gap: 6 }}>
      <input autoFocus placeholder="Item" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1 }} />
      <input placeholder="qty" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} style={{ width: 34, textAlign: 'center' }} />
      <input placeholder="0.00" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} style={{ width: 60, textAlign: 'right' }} />
      <button type="button" className="btn sm accent" onClick={add}>
        Add
      </button>
    </div>
  );
}
