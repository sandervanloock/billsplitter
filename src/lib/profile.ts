/** Locally remembered identity (name + IBAN) so returning users don't retype it. */

const NAME_KEY = 'billsplit:name';
const LEGACY_NAME_KEY = 'billsplit:hostName'; // pre-profile key, read as fallback
const IBAN_KEY = 'billsplit:iban';

export function savedName(): string {
  return localStorage.getItem(NAME_KEY) ?? localStorage.getItem(LEGACY_NAME_KEY) ?? '';
}

export function savedIban(): string {
  return localStorage.getItem(IBAN_KEY) ?? '';
}

export function saveProfile(p: { name?: string; iban?: string }): void {
  if (p.name?.trim()) localStorage.setItem(NAME_KEY, p.name.trim());
  if (p.iban?.trim()) localStorage.setItem(IBAN_KEY, p.iban);
}
