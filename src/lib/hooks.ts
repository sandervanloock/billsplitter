import { onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { ensureSignedIn } from '../firebase';
import { itemsRef, participantsRef, sessionRef, snapToItem, snapToParticipant, snapToSession } from './fb';
import type { Item, Participant, Session } from './model';

/** Resolves to the anonymous Firebase user; undefined while signing in. */
export function useAuthUser(): User | undefined {
  const [user, setUser] = useState<User>();
  useEffect(() => {
    let on = true;
    ensureSignedIn().then((u) => on && setUser(u));
    return () => {
      on = false;
    };
  }, []);
  return user;
}

/** undefined = loading, null = not found / no access. */
export function useSession(sessionId: string | undefined, ready = true): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    if (!sessionId || !ready) return;
    return onSnapshot(
      sessionRef(sessionId),
      (snap) => setSession(snap.exists() ? snapToSession(snap) : null),
      () => setSession(null),
    );
  }, [sessionId, ready]);
  return session;
}

export function useItems(sessionId: string | undefined, ready = true): Item[] | undefined {
  const [items, setItems] = useState<Item[]>();
  useEffect(() => {
    if (!sessionId || !ready) return;
    return onSnapshot(query(itemsRef(sessionId), orderBy('order')), (snap) => setItems(snap.docs.map(snapToItem)));
  }, [sessionId, ready]);
  return items;
}

export function useParticipants(sessionId: string | undefined, ready = true): Participant[] | undefined {
  const [participants, setParticipants] = useState<Participant[]>();
  useEffect(() => {
    if (!sessionId || !ready) return;
    return onSnapshot(query(participantsRef(sessionId), orderBy('joinedAt')), (snap) =>
      setParticipants(snap.docs.map(snapToParticipant)),
    );
  }, [sessionId, ready]);
  return participants;
}
