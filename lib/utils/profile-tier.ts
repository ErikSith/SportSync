/**
 * Athlete tier ladder keyed off karma_score.
 */
export function profileTierLabel(karmaScore: number): string {
  if (karmaScore >= 3000) return 'LEGEND';
  if (karmaScore >= 1500) return 'ELITE TIER';
  if (karmaScore >= 500) return 'PRO TIER';
  if (karmaScore >= 100) return 'RISING STAR';
  return 'ROOKIE';
}
