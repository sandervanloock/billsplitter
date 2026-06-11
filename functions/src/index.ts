import express from 'express';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { MOCK_BILL } from './mockBill';

initializeApp();

const geminiKey = defineSecret('GEMINI_API_KEY');
// Pinned in one place: swap to a newer Flash-Lite here when Google retires 2.5.
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite';

const server = express();

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * WhatsApp's link crawler runs no JS, so /j/{id} is served here with Open Graph
 * tags; humans get JS-redirected into the SPA join route.
 */
server.get('/j/:id', async (req, res) => {
  const id = req.params.id;
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(id)) {
    res.status(400).send('Bad session id');
    return;
  }
  let title = 'BillSplitter';
  let description = 'Pick what you had and pay your share.';
  try {
    const snap = await getFirestore().doc(`sessions/${id}`).get();
    const s = snap.data();
    if (s) {
      const total = ((s.billTotalCents ?? 0) / 100).toFixed(2);
      title = `${s.name} — €${total}`;
      description = `${s.hostName} paid the bill (${s.itemCount} items). Tap to pick what you had and pay your share.`;
    }
  } catch (err) {
    console.error('og lookup failed', err);
  }
  const origin = `https://${req.hostname}`;
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${origin}/j/${id}">
<meta property="og:image" content="${origin}/og.png">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<link rel="icon" href="${origin}/favicon.svg" type="image/svg+xml">
<script>location.replace('/join/${id}');</script>
</head><body>
<p>Joining… <a href="/join/${id}">tap here if nothing happens</a></p>
</body></html>`;
  res.set('Cache-Control', 'public, max-age=300').type('html').send(html);
});

const EXTRACT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    currency: { type: 'STRING' },
    billTotalCents: { type: 'INTEGER' },
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          qty: { type: 'INTEGER' },
          unitPriceCents: { type: 'INTEGER' },
          lineTotalCents: { type: 'INTEGER' },
          confidence: { type: 'NUMBER' },
        },
        required: ['name', 'qty', 'unitPriceCents', 'confidence'],
      },
    },
  },
  required: ['currency', 'items'],
};

const EXTRACT_PROMPT = `You are reading a photo of a restaurant bill. Extract every line item.
Rules:
- All money amounts are integer cents (e.g. €14.50 -> 1450).
- unitPriceCents is the price of ONE unit; qty is how many units the line has.
- lineTotalCents is the printed line total when visible.
- billTotalCents is the printed grand total when visible.
- confidence is 0..1 for how sure you are about that line (name AND numbers).
- Skip tip/total/subtotal/VAT summary lines; only orderable items.
- currency is the ISO code, e.g. EUR.`;

/** Server-side Gemini call so the API key never reaches the browser. Never writes Firestore. */
server.post('/api/extract', express.raw({ type: () => true, limit: '8mb' }), async (req, res) => {
  const authHeader = req.header('Authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) {
    res.status(401).json({ error: 'Missing auth token' });
    return;
  }
  try {
    await getAuth().verifyIdToken(idToken);
  } catch {
    res.status(401).json({ error: 'Invalid auth token' });
    return;
  }

  const mock = process.env.MOCK_EXTRACT === '1' || (process.env.FUNCTIONS_EMULATOR === 'true' && !process.env.GEMINI_API_KEY);
  if (mock) {
    res.json(MOCK_BILL);
    return;
  }

  const image = req.body as Buffer;
  if (!Buffer.isBuffer(image) || image.length === 0) {
    res.status(400).json({ error: 'Send the JPEG as the raw request body' });
    return;
  }

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey.value()}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: 'image/jpeg', data: image.toString('base64') } },
                { text: EXTRACT_PROMPT },
              ],
            },
          ],
          generationConfig: {
            response_mime_type: 'application/json',
            response_schema: EXTRACT_SCHEMA,
            temperature: 0,
          },
        }),
      },
    );
    if (!r.ok) {
      console.error('gemini error', r.status, await r.text());
      res.status(502).json({ error: 'Bill reading service unavailable' });
      return;
    }
    const data = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      res.status(502).json({ error: 'No result from the bill reader' });
      return;
    }
    res.json(JSON.parse(text));
  } catch (err) {
    console.error('extract failed', err);
    res.status(500).json({ error: 'Bill reading failed' });
  }
});

export const app = onRequest(
  { region: 'europe-west1', maxInstances: 3, memory: '256MiB', secrets: [geminiKey] },
  server,
);
