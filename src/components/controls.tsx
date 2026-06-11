/** Small shared controls: checkbox, qty stepper, copyable field. */
import { useToast } from './Toast';
import { copyText } from '../lib/share';

export function Check({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      className={`check ${on ? 'on' : ''}`}
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={on}
      style={disabled ? { opacity: 0.4, cursor: 'default' } : undefined}
    />
  );
}

export function Qty({
  value,
  max,
  onChange,
}: {
  value: number;
  /** Highest value the + button may reach (current + remaining). */
  max: number;
  onChange: (next: number) => void;
}) {
  return (
    <span className={`qty ${value === 0 ? 'off' : ''}`}>
      <button type="button" className="pm" onClick={() => value > 0 && onChange(value - 1)} aria-label="less">
        −
      </button>
      <b>{value}</b>
      <button
        type="button"
        className={`pm act ${value >= max ? 'maxed' : ''}`}
        onClick={() => onChange(value + 1)}
        aria-label="more"
      >
        +
      </button>
    </span>
  );
}

export function CopyField({ label, value, copyValue }: { label: string; value: string; copyValue?: string }) {
  const toast = useToast();
  return (
    <div
      className="field fill"
      style={{ cursor: 'pointer' }}
      onClick={async () => {
        toast((await copyText(copyValue ?? value)) ? `${label} copied` : 'Could not copy');
      }}
    >
      <span className="lab">{label} — tap to copy</span>
      <span className="val" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        {value}
        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>⧉</span>
      </span>
    </div>
  );
}
