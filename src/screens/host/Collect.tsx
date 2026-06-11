import { Avatar } from '../../components/Avatar';
import { useToast } from '../../components/Toast';
import { markPaid, markSettled } from '../../lib/claims';
import type { Participant, Session } from '../../lib/model';
import { joinUrl } from '../../lib/model';
import { formatCents } from '../../lib/money';
import { reminderMessage, shareText } from '../../lib/share';
import { splitOrder } from '../../lib/totals';

/** H6 — collected progress, paid tags, remind/nudge via share sheet. */
export function Collect({ session, participants }: { session: Session; participants: Participant[] }) {
  const toast = useToast();
  const ordered = splitOrder(participants);
  const debtors = ordered.filter((p) => p.id !== session.hostUid);
  const totalOwed = debtors.reduce((s, p) => s + (p.owedCents ?? 0), 0);
  const collected = debtors.filter((p) => p.paid).reduce((s, p) => s + (p.owedCents ?? 0), 0);
  const unpaid = debtors.filter((p) => !p.paid && (p.owedCents ?? 0) > 0);
  const allSettled = unpaid.length === 0;

  function remind(p: Participant) {
    shareText(reminderMessage(session.name, session.hostName, p.owedCents ?? 0, joinUrl(session.id)));
  }

  return (
    <div className="scr">
      <div className="appbar">
        <h3>Getting paid back</h3>
        {session.status === 'settled' && <span className="step">settled</span>}
      </div>

      <div className="box" style={{ padding: 12 }}>
        <div className="total">
          <span className="muted">Collected</span>
          <span className="h-sm">
            {formatCents(collected)} / {formatCents(totalOwed, false)}
          </span>
        </div>
        <div className="progressbar ok" style={{ marginTop: 8 }}>
          <div style={{ width: totalOwed > 0 ? `${Math.round((collected / totalOwed) * 100)}%` : '100%' }} />
        </div>
      </div>

      <div className="box" style={{ padding: '4px 12px' }}>
        {ordered.map((p, i) => {
          const isHost = p.id === session.hostUid;
          return (
            <div className="item" key={p.id}>
              <Avatar name={p.displayName} index={i} />
              <span className="nm">
                {p.displayName}
                {isHost && <span className="muted"> you</span>}
                {!isHost && !p.paid && <span className="muted"> {formatCents(p.owedCents ?? 0)}</span>}
              </span>
              {isHost ? (
                <span className="muted">—</span>
              ) : p.paid ? (
                <span
                  className="tag ok"
                  style={p.isManual ? { cursor: 'pointer' } : undefined}
                  onClick={p.isManual ? () => markPaid(session.id, p.id, false).catch((e) => toast(e.message)) : undefined}
                >
                  paid
                </span>
              ) : (
                <span className="row" style={{ gap: 6 }}>
                  {p.isManual && (
                    <button
                      type="button"
                      className="btn sm"
                      onClick={() => markPaid(session.id, p.id, true).catch((e) => toast(e.message))}
                    >
                      Got cash ✓
                    </button>
                  )}
                  <button type="button" className="btn sm ghost" onClick={() => remind(p)}>
                    Remind
                  </button>
                </span>
              )}
            </div>
          );
        })}
      </div>

      {!allSettled && (
        <button
          type="button"
          className="btn ghost full"
          onClick={() =>
            shareText(
              `👋 Friendly reminder for "${session.name}": ${unpaid
                .map((p) => `${p.displayName} ${formatCents(p.owedCents ?? 0)}`)
                .join(', ')}. Pay ${session.hostName} back here: ${joinUrl(session.id)}`,
            )
          }
        >
          Nudge everyone unpaid
        </button>
      )}

      <div className="grow" />
      {allSettled ? (
        <div className="endcard">
          <div className="big-ic">🎉</div>
          <div className="h-sm">Everyone’s settled</div>
          {session.status !== 'settled' && (
            <button type="button" className="btn full" style={{ marginTop: 10 }} onClick={() => markSettled(session.id).catch((e) => toast(e.message))}>
              Wrap it up
            </button>
          )}
        </div>
      ) : (
        <div className="foot-hint">payments are self-reported — trust your friends ✌️</div>
      )}
    </div>
  );
}
