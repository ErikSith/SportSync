/**
 * Typed result wrapper for data-layer queries.
 * Distinguishes empty results from query failures — required before AI agents
 * can trust platform state snapshots.
 */
export type DataResult<T> =
  | { ok: true; data: T; error?: undefined }
  | { ok: false; data: T; error: string };

export function ok<T>(data: T): DataResult<T> {
  return { ok: true, data };
}

export function fail<T>(empty: T, error: string): DataResult<T> {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[data-layer]', error);
  }
  return { ok: false, data: empty, error };
}

export function fromSupabase<T>(
  data: T | null,
  error: { message: string } | null,
  empty: T,
  context: string,
): DataResult<T> {
  if (error) return fail(empty, `${context}: ${error.message}`);
  return ok(data ?? empty);
}
