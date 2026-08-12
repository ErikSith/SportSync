export const LOBBY_FORMATS = ['singles', 'doubles', 'group'] as const;

export type LobbyFormat = (typeof LOBBY_FORMATS)[number];

export const LOBBY_FORMAT_LABELS: Record<LobbyFormat, string> = {
  singles: 'Singles',
  doubles: 'Doubles',
  group: 'Group Session',
};

/** Maps UI labels and legacy values to the DB check constraint values. */
export function normalizeLobbyFormat(value: string): LobbyFormat | null {
  const key = value.trim().toLowerCase();
  if (key === 'singles' || key === 'single') return 'singles';
  if (key === 'doubles' || key === 'double') return 'doubles';
  if (key === 'group' || key === 'group session' || key === 'casual match') return 'group';
  return LOBBY_FORMATS.includes(key as LobbyFormat) ? (key as LobbyFormat) : null;
}

export function formatLobbyLabel(format: string): string {
  const normalized = normalizeLobbyFormat(format);
  if (normalized) return LOBBY_FORMAT_LABELS[normalized];
  return format;
}
