export function lobbyTierLabel(skillLevel: number | null): string {
  if (skillLevel === null) return 'CHALLENGER';
  if (skillLevel >= 1600) return 'ELITE TIER';
  if (skillLevel >= 1400) return 'MASTER TIER';
  return 'CHALLENGER';
}
