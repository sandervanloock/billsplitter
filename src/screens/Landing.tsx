import { Link } from 'react-router-dom';
import '../styles/landing.css';

export function LandingScreen() {
  return (
    <div className="landing">
      <div className="nav">
        <div className="nav-in">
          <div className="brand">
            <span className="logo">🧾</span> BillSplitter
          </div>
          <div className="nav-links">
            <a href="#how">How it works</a>
            <a href="#shared">Shared items</a>
            <a href="#pay">Pay back</a>
            <Link className="nav-cta" to="/new">
              Start a session
            </Link>
          </div>
        </div>
      </div>

      <header className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <div className="badge">
              <span className="dot" /> Snap a receipt → split in seconds
            </div>
            <div className="kick">no more “who had the wine?”</div>
            <h1>
              Split the bill
              <br />
              without the{' '}
              <span className="scribble">
                math.
                <svg viewBox="0 0 200 14" preserveAspectRatio="none">
                  <path d="M2 9 C 40 3, 80 12, 120 6 S 180 3, 198 8" stroke="#FF6B5E" strokeWidth="4" fill="none" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="lead">
              Take a photo of the receipt and BillSplitter reads every item and price for you. Share a link, everyone grabs what they had,
              and you get paid back over a QR code. That’s it.
            </p>
            <div className="cta-row">
              <Link className="cta" to="/new">
                Start a session <span className="arrow">→</span>
              </Link>
              <span className="cta-note">
                <span className="turn">↩</span> you’re the one who paid
              </span>
            </div>
          </div>

          <div className="art">
            <div className="blob" />
            <div className="float f-scan">
              <span className="emoji">📸</span> Scanning…
            </div>
            <div className="receipt">
              <div className="rhead">
                <div className="shop">Bellini</div>
                <div className="sub">Fri · table 7 · 4 people</div>
              </div>
              <div className="rrow">
                <span className="rn">Burger</span>
                <span className="rp">14.50</span>
                <span className="who av-b">M</span>
              </div>
              <div className="rrow">
                <span className="rn">Steak</span>
                <span className="rp">22.00</span>
                <span className="who av-c">J</span>
              </div>
              <div className="rrow">
                <span className="rn">Wine ×2</span>
                <span className="rp">12.00</span>
                <span className="who av-a">S</span>
              </div>
              <div className="rrow">
                <span className="rn">💧 Water</span>
                <span className="rp">4.00</span>
                <span className="who" style={{ background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }}>
                  all
                </span>
              </div>
              <div className="rtot">
                <span className="rp">Total</span>
                <span className="big">€72.40</span>
              </div>
            </div>
            <div className="float f-split">
              <span className="emoji">✨</span> Split 4 ways
            </div>
            <div className="float f-qr">
              <span className="mini-qr" /> Scan to pay
            </div>
          </div>
        </div>
        <div className="wrap" style={{ marginTop: 46 }}>
          <div className="strip">
            <span>
              <b>AI reads</b> the receipt
            </span>
            <span className="sep" />
            <span>
              <b>No app</b> to install
            </span>
            <span className="sep" />
            <span>
              <b>SEPA QR</b> payback
            </span>
            <span className="sep" />
            <span>
              <b>Free</b> to use
            </span>
          </div>
        </div>
      </header>

      <section id="how">
        <div className="wrap">
          <div className="sec-head">
            <span className="sec-kick">four taps, done</span>
            <h2>How BillSplitter works</h2>
            <p>From a crumpled receipt to everyone paid — without a spreadsheet or that one friend doing mental math.</p>
          </div>
          <div className="steps">
            <div className="step">
              <span className="num">01</span>
              <div className="icon">📸</div>
              <h3>Snap the bill</h3>
              <p>Photograph the receipt. AI pulls out every item and price — fix anything it misreads with a tap.</p>
            </div>
            <div className="step">
              <span className="num">02</span>
              <div className="icon">🔗</div>
              <h3>Share the link</h3>
              <p>Drop in the IBAN you’ll be paid back to, then share a link or QR. Friends join with their name — no app needed.</p>
            </div>
            <div className="step">
              <span className="num">03</span>
              <div className="icon">🙋</div>
              <h3>Everyone picks</h3>
              <p>Each person taps what they ordered. Shared things like water split evenly. You can pick for anyone too.</p>
            </div>
            <div className="step">
              <span className="num">04</span>
              <div className="icon">💸</div>
              <h3>Get paid back</h3>
              <p>Close the session and everyone gets a QR that opens their bank app pre-filled. Watch the money roll in.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="shared" style={{ paddingTop: 20 }}>
        <div className="wrap">
          <div className="feat">
            <div className="feat-copy">
              <span className="ftag">the water everyone drank</span>
              <h3>Shared items, split fairly</h3>
              <p>
                The bottle of water, the bread, that round of shots — mark anything as shared and BillSplitter divides it evenly across the
                whole table. No awkward “I’ll just cover it.”
              </p>
              <ul className="checklist">
                <li>
                  <span className="tick">✓</span> Toggle any item as shared in one tap
                </li>
                <li>
                  <span className="tick">✓</span> Splits evenly the moment a new person joins
                </li>
                <li>
                  <span className="tick">✓</span> Everyone sees exactly what they owe
                </li>
              </ul>
            </div>
            <div className="feat-art">
              <div className="approw">
                <span className="chk on" />
                <span className="an">Burger</span>
                <span className="ap">14.50</span>
              </div>
              <div className="approw">
                <span className="chk" />
                <span className="an">Steak</span>
                <span className="ap">22.00</span>
              </div>
              <div className="approw">
                <span className="chk on" />
                <span className="an">🥖 Bread basket</span>
                <span className="ap">2.20</span>
              </div>
              <div className="approw">
                <span className="chk on" />
                <span className="an">💧 Water ×2</span>
                <span className="ap">4.00</span>
              </div>
              <div className="shared-pill">
                <span>💧 Shared pool · split ÷4</span>
                <span>€1.55 each</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pay" style={{ paddingTop: 20 }}>
        <div className="wrap">
          <div className="feat flip">
            <div className="feat-art">
              <div className="qr-card">
                <div className="qr-big" />
                <div className="pay-people">
                  <div className="pay-row">
                    <span className="who av-b">M</span>
                    <span className="nm">Maya</span>
                    <span className="st st-paid">✓ paid</span>
                  </div>
                  <div className="pay-row">
                    <span className="who av-c">J</span>
                    <span className="nm">Jonas</span>
                    <span className="st st-paid">✓ paid</span>
                  </div>
                  <div className="pay-row">
                    <span className="who av-d">A</span>
                    <span className="nm">Ana</span>
                    <span className="st st-due">due</span>
                  </div>
                </div>
              </div>
              <div
                style={{
                  borderTop: '1px solid var(--line-2)',
                  marginTop: 16,
                  paddingTop: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Collected so far</span>
                <span style={{ fontSize: 20, fontWeight: 700 }}>
                  €48.20 <span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 500 }}>/ 72.40</span>
                </span>
              </div>
            </div>
            <div className="feat-copy">
              <span className="ftag">no IBAN typing, ever</span>
              <h3>Paid back over QR</h3>
              <p>
                When the bill’s divided, everyone gets a SEPA payment QR. They scan it with their banking app and it’s pre-filled with your
                IBAN, the exact amount, and a reference. You just watch who’s settled.
              </p>
              <ul className="checklist">
                <li>
                  <span className="tick">✓</span> One scan opens their bank app, ready to send
                </li>
                <li>
                  <span className="tick">✓</span> Live tracker shows who’s paid and who hasn’t
                </li>
                <li>
                  <span className="tick">✓</span> Nudge stragglers with a tap
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="final">
        <div className="wrap">
          <div className="final-card">
            <div className="fk">your turn</div>
            <h2>Got the bill? Start splitting.</h2>
            <p>Set up a session, snap the receipt, and send the link around the table. Takes about a minute.</p>
            <Link className="cta light" to="/new">
              Start a session <span className="arrow">→</span>
            </Link>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap foot-in">
          <div className="brand" style={{ fontSize: 16 }}>
            <span className="logo" style={{ width: 28, height: 28, fontSize: 15 }}>
              🧾
            </span>{' '}
            BillSplitter
          </div>
          <div className="foot-links">
            <a href="#how">How it works</a>
            <a href="#shared">Shared items</a>
            <a href="#pay">Pay back</a>
          </div>
          <span>Split the bill, keep the friends.</span>
        </div>
      </footer>
    </div>
  );
}
