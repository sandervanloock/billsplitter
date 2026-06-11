/** Builds the payment payload shared by the participant Pay screen and the
 * host Collect screen, so both render the exact same EPC QR. No Firebase imports. */

import type { Participant, Session } from './model';
import { buildEpcPayload, sanitizeEpcText } from './money';

export function paymentReference(sessionName: string, displayName: string): string {
  return sanitizeEpcText(`${sessionName} - ${displayName}`, 140);
}

export function epcPayloadFor(
  session: Pick<Session, 'hostName' | 'iban' | 'name'>,
  p: Pick<Participant, 'displayName' | 'owedCents'>,
): string {
  return buildEpcPayload({
    beneficiaryName: session.hostName,
    iban: session.iban,
    amountCents: p.owedCents ?? 0,
    remittance: paymentReference(session.name, p.displayName),
  });
}
