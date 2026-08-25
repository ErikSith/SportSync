/**
 * Head-to-head fixtures ("FK Inter vs FC Petržalka") are watch-only.
 * Lobby "Tím vs Tím" challenges stay joinable — do not use this helper there.
 */
const HEAD_TO_HEAD = /^(.+?)\s+(?:vs\.?|versus|proti)\s+(.+)$/i;

export function titleLooksLikeHeadToHeadFixture(title: string): boolean {
  const t = title.trim().replace(/\s+/g, ' ');
  const m = HEAD_TO_HEAD.exec(t);
  if (!m?.[1] || !m[2]) return false;
  return m[1].trim().length >= 2 && m[2].trim().length >= 2;
}

export function listingParticipationMode(
  title: string,
  stored: string | null | undefined,
): 'spectator' | 'participate' {
  if (titleLooksLikeHeadToHeadFixture(title)) return 'spectator';
  return stored === 'spectator' ? 'spectator' : 'participate';
}
