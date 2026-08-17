export const GROUP_SPORT_ICONS: Record<string, string> = {
  TENNIS: 'sports_tennis',
  PADEL: 'sports_tennis',
  SQUASH: 'sports_tennis',
  RUNNING: 'run_circle',
  FOOTBALL: 'sports_soccer',
  BASKETBALL: 'sports_basketball',
  YOGA: 'self_improvement',
  COMBAT: 'sports_mma',
  FITNESS: 'fitness_center',
  SWIMMING: 'pool',
  CLIMBING: 'hiking',
  BOWLING: 'sports',
};

export type SessionRsvpStatus = 'pending' | 'going' | 'maybe' | 'declined';

export const GEAR_ITEMS = ['ball', 'bibs', 'pump'] as const;
export type GearItem = (typeof GEAR_ITEMS)[number];

export const GEAR_ITEM_LABELS: Record<GearItem, { label: string; icon: string }> = {
  ball: { label: 'Ball', icon: 'sports_volleyball' },
  bibs: { label: 'Bibs', icon: 'checkroom' },
  pump: { label: 'Pump', icon: 'air' },
};

export const DAY_OF_WEEK_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const WALLET_TRANSACTION_TYPE_LABELS: Record<string, string> = {
  topup: 'Top up',
  session_payment: 'Session payment',
  adjustment: 'Adjustment',
};

export interface GroupMemberPreview {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
}

export interface GroupNextActivityCoordination {
  goingCount: number;
  locationNote: string | null;
  destinationName: string | null;
  destinationAddress: string | null;
  parkingNote: string | null;
  venueId: string | null;
  eventId: string | null;
}

export interface GroupCardData {
  id: string;
  name: string;
  sport: string;
  description: string | null;
  inviteCode: string;
  memberCount: number;
  members: GroupMemberPreview[];
  nextActivityAt: Date | null;
  nextActivityTitle: string | null;
  nextActivityId: string | null;
  nextActivityCoordination: GroupNextActivityCoordination | null;
  isOwner: boolean;
  viewerRole: string;
}

export interface GroupMemberData {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  joinedAt: Date;
  isOwner: boolean;
}

export interface GroupActivityData {
  id: string;
  title: string;
  sport: string;
  scheduledAt: Date;
  locationNote: string | null;
  lobbyId: string | null;
  createdById: string;
  createdByName: string;
  destinationName: string | null;
  destinationAddress: string | null;
  parkingNote: string | null;
  venueId: string | null;
  venueName: string | null;
  eventId: string | null;
  eventTitle: string | null;
  goingCount: number;
  /** Sticky weekly pin — same session rolls to next week after the day passes. */
  isPinned: boolean;
  /** User ids who RSVP'd going (for avatar stacks on mini cards). */
  goingUserIds: string[];
  /** User ids who RSVP'd declined. */
  declinedUserIds: string[];
}

export interface SessionRsvpData {
  userId: string;
  name: string;
  avatarUrl: string | null;
  status: SessionRsvpStatus;
  paid: boolean;
  isOwner: boolean;
}

export interface GearClaimData {
  item: GearItem;
  userId: string;
  name: string;
}

export interface SessionDetailData {
  id: string;
  groupId: string;
  groupName: string;
  title: string;
  sport: string;
  scheduledAt: Date;
  locationNote: string | null;
  lobbyId: string | null;
  createdByName: string;
  destinationName: string | null;
  destinationAddress: string | null;
  parkingNote: string | null;
  venueId: string | null;
  venueName: string | null;
  eventId: string | null;
  eventTitle: string | null;
  members: GroupMemberData[];
  rsvps: SessionRsvpData[];
  viewerId: string;
  isOwner: boolean;
  gearClaims: GearClaimData[];
  openToMercenaries: boolean;
  spotsNeeded: number | null;
  mercenaryLobbyId: string | null;
}

export interface WalletTransactionData {
  id: string;
  userId: string;
  userName: string;
  amountCents: number;
  type: string;
  sessionId: string | null;
  description: string | null;
  createdAt: Date;
}

export interface WalletData {
  groupId: string;
  balanceCents: number;
  currency: string;
  transactions: WalletTransactionData[];
}

export interface MemberStatData {
  userId: string;
  name: string;
  avatarUrl: string | null;
  points: number;
  sessionsAttended: number;
  sessionsDeclined: number;
  wins: number;
  badges: string[];
}

export interface RecurringScheduleData {
  id: string;
  title: string;
  sport: string;
  dayOfWeek: number;
  timeOfDay: string;
  locationNote: string | null;
  isActive: boolean;
  lastGeneratedAt: Date | null;
}

export interface GroupDetailData {
  id: string;
  name: string;
  description: string | null;
  sport: string;
  inviteCode: string;
  createdAt: Date;
  ownerId: string;
  ownerName: string;
  members: GroupMemberData[];
  activities: GroupActivityData[];
  isOwner: boolean;
  viewerRole: string;
  leaderboard: MemberStatData[];
  recurringSchedules: RecurringScheduleData[];
}

export function formatGroupSchedule(date: Date): string {
  const now = new Date();
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  if (date.toDateString() === now.toDateString()) {
    return `Today, ${time}`;
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow, ${time}`;
  }

  const day = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${day}, ${time}`;
}

export function sportDisplayLabel(sport: string): string {
  return sport.charAt(0) + sport.slice(1).toLowerCase();
}

export function formatSessionCost(cents: number | null, currency = 'EUR'): string {
  if (cents === null || cents <= 0) return 'Free';
  const amount = cents / 100;
  return currency === 'EUR' ? `€${amount.toFixed(2)}` : `${amount.toFixed(2)} ${currency}`;
}

export function perPersonCost(totalCents: number | null, goingCount: number, currency = 'EUR'): string {
  if (!totalCents || totalCents <= 0 || goingCount <= 0) return '—';
  return formatSessionCost(Math.round(totalCents / goingCount), currency);
}

export function formatWalletCents(cents: number, currency = 'EUR'): string {
  const amount = cents / 100;
  return currency === 'EUR' ? `€${amount.toFixed(2)}` : `${amount.toFixed(2)} ${currency}`;
}

export function formatDayTime(dayOfWeek: number, timeOfDay: string): string {
  const day = DAY_OF_WEEK_LABELS[dayOfWeek] ?? 'Day';
  return `Every ${day}, ${timeOfDay}`;
}

/**
 * Computes fun crew badges by comparing every member's stat row against the
 * rest of the group. "Iron Man" goes to the highest attendance (min. 3
 * sessions), "Ghost" to the highest decline count (min. 3 declines) — both
 * only awarded when there is a clear (non-tied) leader.
 */
export function buildLeaderboard(
  stats: { userId: string; name: string; avatarUrl: string | null; points: number; sessionsAttended: number; sessionsDeclined: number; wins: number }[],
): MemberStatData[] {
  const maxAttended = Math.max(0, ...stats.map((s) => s.sessionsAttended));
  const maxDeclined = Math.max(0, ...stats.map((s) => s.sessionsDeclined));
  const ironManCandidates = stats.filter((s) => s.sessionsAttended === maxAttended && maxAttended >= 3);
  const ghostCandidates = stats.filter((s) => s.sessionsDeclined === maxDeclined && maxDeclined >= 3);

  return stats
    .map((stat) => {
      const badges: string[] = [];
      if (ironManCandidates.length === 1 && ironManCandidates[0]?.userId === stat.userId) badges.push('Iron Man');
      if (ghostCandidates.length === 1 && ghostCandidates[0]?.userId === stat.userId) badges.push('Ghost');
      if (stat.wins > 0) badges.push(stat.wins >= 5 ? 'Champion' : 'Winner');
      return { ...stat, badges };
    })
    .sort((a, b) => b.points - a.points);
}

export function coordinationProgress(activity: GroupActivityData, memberCount: number): {
  rsvpPct: number;
  destinationDone: boolean;
  parkingDone: boolean;
  bookingLinked: boolean;
} {
  const rsvpPct = memberCount > 0 ? Math.round((activity.goingCount / memberCount) * 100) : 0;
  const destinationDone = Boolean(activity.destinationName || activity.destinationAddress || activity.locationNote);
  const parkingDone = Boolean(activity.parkingNote);
  const bookingLinked = Boolean(activity.venueId || activity.eventId);

  return { rsvpPct, destinationDone, parkingDone, bookingLinked };
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function groupActivityFromCard(group: GroupCardData): GroupActivityData | null {
  if (!group.nextActivityId || !group.nextActivityAt || !group.nextActivityCoordination) return null;
  const c = group.nextActivityCoordination;
  return {
    id: group.nextActivityId,
    title: group.nextActivityTitle ?? '',
    sport: group.sport,
    scheduledAt: group.nextActivityAt,
    locationNote: c.locationNote,
    lobbyId: null,
    createdById: '',
    createdByName: '',
    destinationName: c.destinationName,
    destinationAddress: c.destinationAddress,
    parkingNote: c.parkingNote,
    venueId: c.venueId,
    venueName: null,
    eventId: c.eventId,
    eventTitle: null,
    goingCount: c.goingCount,
    isPinned: false,
    goingUserIds: [],
    declinedUserIds: [],
  };
}

export function pickSoonestGroupWithActivity(groups: GroupCardData[]): GroupCardData | null {
  const withActivity = groups.filter((g) => g.nextActivityAt && g.nextActivityId);
  if (!withActivity.length) return null;
  return withActivity.sort((a, b) => a.nextActivityAt!.getTime() - b.nextActivityAt!.getTime())[0] ?? null;
}

export function isCoordinationIncomplete(group: GroupCardData): boolean {
  const activity = groupActivityFromCard(group);
  if (!activity) return false;
  const progress = coordinationProgress(activity, group.memberCount);
  return progress.rsvpPct < 100 || !progress.destinationDone || !progress.parkingDone || !progress.bookingLinked;
}

export function weakestCoordinationStep(group: GroupCardData): string {
  const activity = groupActivityFromCard(group);
  if (!activity) return '';
  const progress = coordinationProgress(activity, group.memberCount);
  if (progress.rsvpPct < 100) {
    return `RSVP ${activity.goingCount}/${group.memberCount}`;
  }
  if (!progress.destinationDone) return 'Destination not set';
  if (!progress.parkingDone) return 'Parking not set';
  if (!progress.bookingLinked) return 'Link venue or event';
  return '';
}

export function pickLobbyActionGroup(groups: GroupCardData[]): GroupCardData | null {
  const soonest = pickSoonestGroupWithActivity(groups);
  if (!soonest?.nextActivityAt) return null;
  const withinWindow = soonest.nextActivityAt.getTime() - Date.now() <= SEVEN_DAYS_MS;
  if (!withinWindow || !isCoordinationIncomplete(soonest)) return null;
  return soonest;
}
