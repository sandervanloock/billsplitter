import { ensureSignedIn } from '../firebase';

export interface ExtractedItem {
  name: string;
  qty: number;
  unitPriceCents: number;
  lineTotalCents?: number;
  confidence: number;
}
export interface ExtractResult {
  currency: string;
  billTotalCents?: number;
  items: ExtractedItem[];
}

const MAX_DIM = 1600;

/** Downscale + re-encode the photo client-side so uploads stay small (≤1600px JPEG). */
export async function downscaleImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.type === 'image/jpeg' && file.size < 2_000_000) return file;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode image'))), 'image/jpeg', 0.85),
  );
}

/** POST the photo to the Cloud Function; Gemini does the reading server-side. */
export async function extractBill(file: File): Promise<ExtractResult> {
  const blob = await downscaleImage(file);
  if (blob.size > 8_000_000) throw new Error('Photo is too large even after downscaling');
  const token = await (await ensureSignedIn()).getIdToken();
  const res = await fetch('/api/extract', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/jpeg' },
    body: blob,
  });
  if (!res.ok) throw new Error(`Bill reading failed (${res.status})`);
  return res.json();
}

/** Items whose math doesn't add up, or that Gemini wasn't sure about, get the amber ⚠. */
export function isLowConfidence(item: ExtractedItem): boolean {
  if (item.confidence < 0.7) return true;
  if (item.lineTotalCents != null && item.qty * item.unitPriceCents !== item.lineTotalCents) return true;
  return false;
}
