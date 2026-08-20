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

/** Short label for profile hero ÚROVEŇ card (e.g. Pro, Elite). */
export function profileTierShortLabel(karmaScore: number): string {
  const tier = profileTierLabel(karmaScore);
  if (tier === 'LEGEND') return 'Legend';
  if (tier === 'ELITE TIER') return 'Elite';
  if (tier === 'PRO TIER') return 'Pro';
  if (tier === 'RISING STAR') return 'Rising';
  return 'Rookie';
}

export function profileIsVerified(role: string, karmaScore: number): boolean {
  const normalized = (role ?? '').toUpperCase();
  if (normalized && normalized !== 'PLAYER') return true;
  const tier = profileTierLabel(karmaScore);
  return tier === 'PRO TIER' || tier === 'ELITE TIER' || tier === 'LEGEND';
}
