import { Avatar } from '../../components/Avatar';
import { QR } from '../../components/QR';
import { useToast } from '../../components/Toast';
import type { Item, Participant, Session } from '../../lib/model';
import { joinUrl } from '../../lib/model';
import { formatCents } from '../../lib/money';
import { copyText, joinMessage, shareText } from '../../lib/share';
import { itemsTotalCents, splitOrder } from '../../lib/totals';

/** H3 — join QR + link, WhatsApp share, live lobby. */
export function Share({
  session,
  items,
  participants,
  onNext,
}: {
  session: Session;
  items: Item[];
  participants: Participant[];
  onNext: () => void;
}) {
  const toast = useToast();
  const url = joinUrl(session.id);
  const total = itemsTotalCents(items);
  const ordered = splitOrder(participants);

  return (
    <div className="scr">
      <div className="appbar">
        <h3>Share &amp; start</h3>
        <span className="step">Step 3/5</span>
      </div>

      <div className="center">
        <div className="h-sm">{session.name}</div>
        <span className="muted">
          Scan to join · {items.length} items · {formatCents(total)}
        </span>
      </div>

      <QR text={url} size={132} label="Join QR" />

      <div className="field" style={{ justifyContent: 'space-between' }}>
        <span className="val" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {url.replace(/^https?:\/\//, '')}
        </span>
        <span
          style={{ fontWeight: 600, color: 'var(--accent)', cursor: 'pointer', flex: '0 0 auto' }}
          onClick={async () => toast((await copyText(url)) ? 'Link copied' : 'Could not copy')}
        >
          ⧉ copy
        </span>
      </div>

      <button
        type="button"
        className="btn full"
        onClick={() => shareText(joinMessage(session.name, session.hostName, total), url)}
      >
        💬 Share via WhatsApp
      </button>

      <div className="divider" />
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="label">Joined so far</span>
        <span className="muted">{participants.length} · more can join anytime</span>
      </div>
      <div>
        {ordered.map((p, i) => (
          <div className="item" key={p.id}>
            <Avatar name={p.displayName} index={i} />
            <span className="nm">
              {p.displayName}
              {p.id === session.hostUid && <span className="muted"> · host</span>}
            </span>
            {p.id === session.hostUid ? <span className="tag accent">you</span> : <span className="muted">joined</span>}
          </div>
        ))}
      </div>
      <div className="box dashed" style={{ padding: '10px 12px', flexDirection: 'row', gap: 7 }}>
        <span style={{ fontSize: 14 }}>👋</span>
        <span className="muted">Others slot in live — no need to wait</span>
      </div>

      <div className="grow" />
      <button type="button" className="btn accent full hot" onClick={onNext}>
        Start distributing →
      </button>
    </div>
  );
}
