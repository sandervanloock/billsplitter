import { formatCents } from './money';

/** Web Share API where available (mobile), wa.me fallback, clipboard as last resort. */
export async function shareText(text: string, url?: string): Promise<'shared' | 'whatsapp' | 'copied'> {
  const full = url ? `${text}\n${url}` : text;
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(url ? { text, url } : { text });
      return 'shared';
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return 'shared'; // user dismissed the sheet
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(full)}`, '_blank', 'noopener');
  return 'whatsapp';
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function joinMessage(sessionName: string, hostName: string, totalCents: number): string {
  return `🧾 ${hostName} paid the bill for "${sessionName}" (${formatCents(totalCents)}). Tap to pick what you had:`;
}

export function reminderMessage(sessionName: string, hostName: string, owedCents: number, joinLink: string): string {
  return `👋 Friendly reminder: you owe ${hostName} ${formatCents(owedCents)} for "${sessionName}". Pay in two taps: ${joinLink}`;
}
