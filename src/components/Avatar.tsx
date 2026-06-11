const CYCLE = ['a', 'b', 'c', 'd'] as const;

/** Deterministic pastel from the participant's position in join order. */
export function Avatar({ name, index, small }: { name: string; index: number; small?: boolean }) {
  const cls = CYCLE[((index % CYCLE.length) + CYCLE.length) % CYCLE.length];
  return <div className={`avatar ${cls}${small ? ' sm' : ''}`}>{(name[0] ?? '?').toUpperCase()}</div>;
}
