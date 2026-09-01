/** Shared verification helpers (client + server safe). */

export interface VerificationFlags {
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  is2faEnabled?: boolean;
}

export function isVerifiedPlayer(flags: VerificationFlags): boolean {
  return flags.isEmailVerified;
}

/** Normalize Slovak mobile input to E.164 (+421XXXXXXXXX). */
export function normalizeSkPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  let national = digits;
  if (national.startsWith('421')) national = national.slice(3);
  else if (national.startsWith('0')) national = national.slice(1);

  if (national.length !== 9 || !national.startsWith('9')) return null;
  return `+421${national}`;
}

export function formatSkPhoneDisplay(e164: string | null | undefined): string {
  if (!e164) return '';
  const digits = e164.replace(/\D/g, '');
  const national = digits.startsWith('421') ? digits.slice(3) : digits;
  if (national.length !== 9) return e164;
  return `+421 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
}

export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const partA = Math.random().toString(36).slice(2, 6).toUpperCase();
    const partB = Math.floor(1000 + Math.random() * 9000).toString();
    codes.push(`${partA}-${partB}`);
  }
  return codes;
}

/** Reject empty / serialized-object noise from auth APIs. */
function isUsableErrorMessage(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed === '{}') return false;
  if (trimmed === '[]') return false;
  if (trimmed === '[object Object]') return false;
  return true;
}

/** Human-readable message from caught errors (Supabase Auth, fetch, etc.). */
export function formatUserError(err: unknown, fallback: string): string {
  if (typeof err === 'string' && isUsableErrorMessage(err)) return err.trim();
  if (err instanceof Error && isUsableErrorMessage(err.message)) return err.message.trim();
  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>;
    if (typeof o.message === 'string' && isUsableErrorMessage(o.message)) return o.message.trim();
    if (typeof o.error_description === 'string' && isUsableErrorMessage(o.error_description)) {
      return o.error_description.trim();
    }
    if (typeof o.msg === 'string' && isUsableErrorMessage(o.msg)) return o.msg.trim();
    if (typeof o.error === 'string' && isUsableErrorMessage(o.error)) return o.error.trim();
    if (typeof o.details === 'string' && isUsableErrorMessage(o.details)) return o.details.trim();
    if (typeof o.hint === 'string' && isUsableErrorMessage(o.hint)) return o.hint.trim();
    if (typeof o.code === 'string' && isUsableErrorMessage(o.code)) {
      return `Chyba: ${o.code}`;
    }
  }
  return fallback;
}

/** Extract error text from JSON API responses — never returns "{}" or "[object Object]". */
export function parseApiErrorPayload(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback;
  const payload = data as Record<string, unknown>;
  if (typeof payload.error === 'string' && isUsableErrorMessage(payload.error)) {
    return payload.error.trim();
  }
  if (payload.error && typeof payload.error === 'object') {
    const nested = formatUserError(payload.error, fallback);
    return isUsableErrorMessage(nested) ? nested : fallback;
  }
  if (typeof payload.message === 'string' && isUsableErrorMessage(payload.message)) {
    return payload.message.trim();
  }
  return fallback;
}
