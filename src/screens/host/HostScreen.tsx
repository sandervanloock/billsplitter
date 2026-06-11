import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuthUser, useItems, useParticipants, useSession } from '../../lib/hooks';
import { Collect } from './Collect';
import { Distribute } from './Distribute';
import { Overview } from './Overview';
import { ReviewItems } from './ReviewItems';
import { Share } from './Share';

export type OpenStep = 'share' | 'distribute' | 'overview';

export function HostScreen() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthUser();
  const session = useSession(id, !!user);
  const items = useItems(id, !!user);
  const participants = useParticipants(id, !!user);
  const [step, setStep] = useState<OpenStep>('share');

  if (!user || session === undefined) return <Loading />;
  if (session === null) return <Gone />;
  if (user.uid !== session.hostUid) return <Navigate to={`/join/${id}`} replace />;
  if (items === undefined || participants === undefined) return <Loading />;

  if (session.status === 'setup') return <ReviewItems session={session} items={items} />;
  if (session.status === 'open') {
    if (step === 'share') return <Share session={session} items={items} participants={participants} onNext={() => setStep('distribute')} />;
    if (step === 'distribute')
      return (
        <Distribute
          session={session}
          items={items}
          participants={participants}
          onBack={() => setStep('share')}
          onNext={() => setStep('overview')}
        />
      );
    return <Overview session={session} items={items} participants={participants} onBack={() => setStep('distribute')} />;
  }
  return <Collect session={session} participants={participants} />;
}

export function Loading() {
  return (
    <div className="scr center" style={{ justifyContent: 'center' }}>
      <span className="kicker">
        <span className="spin" style={{ display: 'inline-block' }}>
          ⟳
        </span>{' '}
        loading…
      </span>
    </div>
  );
}

export function Gone() {
  return (
    <div className="scr center" style={{ justifyContent: 'center' }}>
      <div className="endcard">
        <div className="big-ic">🌫️</div>
        <div className="h-sm">This session doesn’t exist (anymore)</div>
        <span className="muted">Sessions expire automatically after 7 days</span>
      </div>
      <a className="btn full" href="/" style={{ textDecoration: 'none' }}>
        Start a new one
      </a>
    </div>
  );
}
