import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { createSession, updateSessionFields, writeExtractedItems } from '../lib/claims';
import { extractBill, isLowConfidence, type ExtractResult } from '../lib/extract';
import { useAuthUser } from '../lib/hooks';
import { formatCents, formatIban, validateIban } from '../lib/money';
import { savedIban, savedName, saveProfile } from '../lib/profile';

type Scan = { state: 'idle' } | { state: 'reading' } | { state: 'done'; result: ExtractResult } | { state: 'error'; message: string };

export function CreateScreen() {
  const user = useAuthUser();
  const navigate = useNavigate();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [scan, setScan] = useState<Scan>({ state: 'idle' });
  const [sessionName, setSessionName] = useState('');
  const [hostName, setHostName] = useState(savedName());
  const [iban, setIban] = useState(savedIban());
  const [busy, setBusy] = useState(false);

  const ibanOk = validateIban(iban);
  const ready = !!user && sessionName.trim() !== '' && hostName.trim() !== '' && ibanOk && scan.state !== 'reading' && !busy;

  async function onPhoto(file: File) {
    setScan({ state: 'reading' });
    try {
      const result = await extractBill(file);
      setScan({ state: 'done', result });
    } catch (err) {
      setScan({ state: 'error', message: (err as Error).message });
    }
  }

  async function start() {
    if (!ready) return;
    setBusy(true);
    try {
      saveProfile({ name: hostName, iban });
      const id = await createSession({ name: sessionName.trim(), hostName: hostName.trim(), iban });
      const result = scan.state === 'done' ? scan.result : undefined;
      if (result && result.items.length > 0) {
        await writeExtractedItems(
          id,
          result.items.map((it) => ({
            name: it.name,
            unitPriceCents: it.unitPriceCents,
            qty: Math.max(1, it.qty),
            lowConfidence: isLowConfidence(it),
          })),
        );
        if (result.billTotalCents) await updateSessionFields(id, { billTotalCents: result.billTotalCents });
      }
      localStorage.setItem(`billsplit:${id}:name`, hostName.trim());
      navigate(`/s/${id}`);
    } catch (err) {
      toast((err as Error).message);
      setBusy(false);
    }
  }

  const extracted = scan.state === 'done' ? scan.result : undefined;
  const extractedTotal = extracted
    ? (extracted.billTotalCents ?? extracted.items.reduce((s, it) => s + it.qty * it.unitPriceCents, 0))
    : undefined;

  return (
    <div className="scr">
      <div className="appbar">
        <h3>Scan &amp; set up</h3>
        <span className="step">Step 1/5</span>
      </div>

      <div className="row" style={{ gap: 12, alignItems: 'center' }}>
        <button
          type="button"
          className="box dashed"
          style={{ width: 72, height: 72, flex: '0 0 auto', padding: 0, fontSize: 24, cursor: 'pointer' }}
          onClick={() => fileInput.current?.click()}
          aria-label="Photograph the bill"
        >
          📷
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPhoto(f);
          }}
        />
        <div className="grow">
          {scan.state === 'idle' && (
            <>
              <div className="h-sm">Snap the bill</div>
              <span className="muted">AI reads the items for you — or add them by hand later</span>
            </>
          )}
          {scan.state === 'reading' && (
            <>
              <div className="h-sm" style={{ color: 'var(--accent)' }}>
                ✨ Reading the bill…
              </div>
              <div className="progressbar" style={{ marginTop: 7 }}>
                <div style={{ width: '80%', animation: 'pulse 1.4s ease-in-out infinite' }} />
              </div>
            </>
          )}
          {scan.state === 'done' && (
            <div className="h-sm" style={{ color: 'var(--ok)' }}>
              ✓ Bill read · {extracted!.items.length} items
              {extractedTotal ? ` · ${formatCents(extractedTotal)}` : ''}
            </div>
          )}
          {scan.state === 'error' && (
            <>
              <div className="h-sm" style={{ color: 'var(--accent)' }}>
                Couldn’t read the photo
              </div>
              <span className="muted">{scan.message} — tap the camera to retry</span>
            </>
          )}
        </div>
      </div>

      <div className="label">Fill these while it reads</div>
      <label className="field fill">
        <span className="lab">Session name</span>
        <input value={sessionName} onChange={(e) => setSessionName(e.target.value)} placeholder="Dinner at Italian" maxLength={60} />
      </label>
      <label className="field fill">
        <span className="lab">Your name (host)</span>
        <input value={hostName} onChange={(e) => setHostName(e.target.value)} placeholder="Your Name" maxLength={40} />
      </label>
      <label className={`field fill ${iban && !ibanOk ? 'invalid' : ''}`}>
        <span className="lab">IBAN — you’re paid back here</span>
        <input
          value={iban}
          onChange={(e) => setIban(e.target.value)}
          onBlur={() => ibanOk && setIban(formatIban(iban))}
          placeholder="BE68 5390 0754 7034"
          autoCapitalize="characters"
          spellCheck={false}
        />
      </label>
      {iban !== '' && !ibanOk && <span className="muted" style={{ color: 'var(--accent)' }}>That IBAN’s checksum doesn’t work out — double-check it</span>}

      <div className="box" style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="muted">Total &amp; currency</span>
        <span className="muted">{extractedTotal != null ? `${formatCents(extractedTotal)} · EUR` : 'fills in automatically ⟳'}</span>
      </div>

      <div className="grow" />
      <button type="button" className="btn accent full hot" disabled={!ready} onClick={start}>
        {busy ? 'Setting up…' : 'Review items →'}
      </button>
    </div>
  );
}
