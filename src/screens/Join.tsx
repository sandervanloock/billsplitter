import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { signInAnonymously, signOut } from 'firebase/auth';
import { useToast } from '../components/Toast';
import { auth } from '../firebase';
import { joinSession } from '../lib/claims';
import { useAuthUser, useParticipants, useSession } from '../lib/hooks';
import { formatCents } from '../lib/money';
import { usePageTitle } from '../lib/title';
import { Gone, Loading } from './host/HostScreen';

/** P1 — session preview + join with just a name. */
export function JoinScreen() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthUser();
  const session = useSession(id, !!user);
  const participants = useParticipants(id, !!user);
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState(localStorage.getItem(`billsplit:${id}:name`) ?? localStorage.getItem('billsplit:hostName') ?? '');
  const [busy, setBusy] = useState(false);
  usePageTitle(session?.name ? `Join ${session.name}` : undefined);

  if (!user || session === undefined || participants === undefined) return <Loading />;
  if (session === null) return <Gone />;
  if (user.uid === session.hostUid) {
    navigate(`/s/${id}`, { replace: true });
    return null;
  }
  if (participants.some((p) => p.id === user.uid)) {
    navigate(`/s/${id}/me`, { replace: true });
    return null;
  }

  const joinable = session.status === 'open';

  async function join() {
    if (!name.trim() || !joinable) return;
    setBusy(true);
    try {
      await joinSession(session!.id, name.trim());
      navigate(`/s/${id}/me`);
    } catch (err) {
      toast((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="scr">
      <div className="appbar">
        <h3>Join session</h3>
      </div>

      <div className="center" style={{ marginTop: 10 }}>
        <span className="muted">You’re invited to</span>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{session.name}</div>
        <span className="muted">
          {session.itemCount} items · {formatCents(session.billTotalCents)} · hosted by {session.hostName}
        </span>
      </div>

      {joinable ? (
        <div className="banner neutral">
          <span>🧾</span>
          <span className="muted">Next you’ll pick the items you had</span>
        </div>
      ) : (
        <div className="banner warn">
          <span>⏳</span>
          <span className="muted">
            {session.status === 'setup'
              ? `${session.hostName} is still setting up — try again in a minute`
              : 'This session is closed — too late to join'}
          </span>
        </div>
      )}

      <div className="label">Join with your name</div>
      <label className="field fill">
        <span className="lab">Your name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Maya"
          maxLength={40}
          onKeyDown={(e) => e.key === 'Enter' && join()}
        />
      </label>

      <div className="grow" />
      {import.meta.env.DEV && (
        <button
          type="button"
          className="btn ghost full"
          onClick={async () => {
            await signOut(auth);
            await signInAnonymously(auth);
            window.location.reload();
          }}
        >
          ＋ new persona (dev)
        </button>
      )}
      <button type="button" className="btn accent full hot" disabled={!joinable || !name.trim() || busy} onClick={join}>
        Join →
      </button>
    </div>
  );
}
