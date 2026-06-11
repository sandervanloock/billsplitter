import { Link } from 'react-router-dom';

const STEPS = [
  { icon: '📷', title: 'Snap the bill', text: 'Photograph the receipt — AI reads every line item for you in seconds.' },
  { icon: '🔗', title: 'Share one link', text: 'Friends join from their phone with just a name. No app, no signup.' },
  { icon: '👆', title: 'Claim your items', text: 'Everyone ticks off what they had, live. Shared items split fairly.' },
  { icon: '💸', title: 'Get paid back', text: 'Each friend scans a bank QR code that pays you the exact amount.' },
];

const PERKS = [
  'No accounts or downloads — a link is all anyone needs',
  'Totals always add up to the cent, even for shared plates',
  'Bank-standard QR codes work with most European banking apps',
];

export function LandingScreen() {
  return (
    <div className="scr">
      <div className="center" style={{ paddingTop: 24 }}>
        <div style={{ fontSize: 52 }}>🧾</div>
        <h1 style={{ fontSize: 30, lineHeight: 1.2, margin: '12px 0 0', fontWeight: 700 }}>
          Split the bill,
          <br />
          not the friendship
        </h1>
        <p className="muted" style={{ fontSize: 16, margin: '12px auto 0', maxWidth: 380 }}>
          BillSplitter turns a photo of the restaurant bill into a shared checklist. Everyone claims what they had and pays you back with a
          single QR scan — no maths, no awkward reminders.
        </p>
      </div>

      <Link className="btn accent full hot" to="/new" style={{ textDecoration: 'none' }}>
        Start a session →
      </Link>
      <div className="foot-hint" style={{ marginTop: -8 }}>
        Free · nothing to install · sessions clean themselves up after 7 days
      </div>

      <div className="divider" />

      <div className="label">How it works</div>
      {STEPS.map((s, i) => (
        <div key={s.title} className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
          <div className="box" style={{ width: 44, height: 44, flex: '0 0 auto', display: 'grid', placeItems: 'center', fontSize: 20 }}>
            {s.icon}
          </div>
          <div className="grow">
            <div className="h-sm">
              {i + 1}. {s.title}
            </div>
            <span className="muted">{s.text}</span>
          </div>
        </div>
      ))}

      <div className="divider" />

      <div className="label">Why people like it</div>
      <div className="box" style={{ padding: '4px 14px' }}>
        {PERKS.map((p) => (
          <div key={p} className="item">
            <span style={{ color: 'var(--ok)', fontWeight: 700 }}>✓</span>
            <span className="nm" style={{ whiteSpace: 'normal' }}>
              {p}
            </span>
          </div>
        ))}
      </div>

      <div className="grow" />
      <Link className="btn accent full" to="/new" style={{ textDecoration: 'none' }}>
        Split your first bill
      </Link>
    </div>
  );
}
