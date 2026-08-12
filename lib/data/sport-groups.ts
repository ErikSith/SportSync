import { createClient } from '@/lib/supabase/server';
import type {
  GearClaimData,
  GearItem,
  GroupActivityData,
  GroupCardData,
  GroupDetailData,
  GroupMemberData,
  GroupMemberPreview,
  MemberStatData,
  RecurringScheduleData,
  SessionDetailData,
  SessionRsvpData,
  SessionRsvpStatus,
} from '@/lib/data/sport-groups-shared';
import { buildLeaderboard } from '@/lib/data/sport-groups-shared';
import { activeFeedSinceIso } from '@/lib/retention/feed-window';

export type {
  GearClaimData,
  GearItem,
  GroupActivityData,
  GroupCardData,
  GroupDetailData,
  GroupMemberData,
  GroupMemberPreview,
  MemberStatData,
  RecurringScheduleData,
  SessionDetailData,
  SessionRsvpData,
  SessionRsvpStatus,
} from '@/lib/data/sport-groups-shared';

export {
  formatGroupSchedule,
  sportDisplayLabel,
  GROUP_SPORT_ICONS,
  coordinationProgress,
  formatDayTime,
  buildLeaderboard,
  GEAR_ITEMS,
  GEAR_ITEM_LABELS,
  DAY_OF_WEEK_LABELS,
} from '@/lib/data/sport-groups-shared';

interface ProfileSnippet {
  id: string;
  full_name: string | null;
  username: string;
  avatar_url: string | null;
}

interface RsvpRow {
  user_id: string;
  status: string;
  paid: boolean;
  profiles: ProfileSnippet | ProfileSnippet[] | null;
}

interface MemberRow {
  user_id: string;
  role: string;
  joined_at: string;
  profiles: ProfileSnippet | ProfileSnippet[] | null;
}

interface ActivityRow {
  id: string;
  title: string;
  sport: string;
  scheduled_at: string;
  location_note: string | null;
  lobby_id: string | null;
  destination_name: string | null;
  destination_address: string | null;
  parking_note: string | null;
  venue_id: string | null;
  event_id: string | null;
  open_to_mercenaries?: boolean | null;
  spots_needed?: number | null;
  mercenary_lobby_id?: string | null;
  profiles: ProfileSnippet | ProfileSnippet[] | null;
  sport_group_activity_rsvps?: RsvpRow[];
  venues?: { id: string; name: string } | Array<{ id: string; name: string }> | null;
  events?: { id: string; title: string } | Array<{ id: string; title: string }> | null;
}

interface GearClaimRow {
  activity_id: string;
  item: string;
  user_id: string;
  profiles: ProfileSnippet | ProfileSnippet[] | null;
}

interface WalletTransactionRow {
  id: string;
  user_id: string;
  amount_cents: number;
  type: string;
  session_id: string | null;
  description: string | null;
  created_at: string;
  profiles: ProfileSnippet | ProfileSnippet[] | null;
}

interface MemberStatRow {
  user_id: string;
  points: number;
  sessions_attended: number;
  sessions_declined: number;
  wins: number;
}

interface RecurringScheduleRow {
  id: string;
  title: string;
  sport: string;
  day_of_week: number;
  time_of_day: string;
  location_note: string | null;
  is_active: boolean;
  last_generated_at: string | null;
}

interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  sport: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
  profiles: ProfileSnippet | ProfileSnippet[] | null;
  sport_group_members: MemberRow[];
  sport_group_activities: ActivityRow[];
}

function resolveProfile(raw: ProfileSnippet | ProfileSnippet[] | null): ProfileSnippet | null {
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

function mapMemberPreview(row: MemberRow): GroupMemberPreview {
  const profile = resolveProfile(row.profiles);
  return {
    id: profile?.id ?? row.user_id,
    name: profile?.full_name ?? profile?.username ?? 'Player',
    avatarUrl: profile?.avatar_url ?? null,
    role: row.role,
  };
}

function mapMember(row: MemberRow, ownerId: string): GroupMemberData {
  const profile = resolveProfile(row.profiles);
  return {
    id: profile?.id ?? row.user_id,
    name: profile?.full_name ?? profile?.username ?? 'Player',
    avatarUrl: profile?.avatar_url ?? null,
    role: row.role,
    joinedAt: new Date(row.joined_at),
    isOwner: row.user_id === ownerId,
  };
}

function countGoing(rsvps: RsvpRow[] | undefined): number {
  return (rsvps ?? []).filter((r) => r.status === 'going').length;
}

function resolveNamed<T extends { id: string }>(raw: T | T[] | null | undefined): T | null {
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

function mapActivity(row: ActivityRow): GroupActivityData {
  const creator = resolveProfile(row.profiles);
  const venue = resolveNamed(row.venues);
  const event = resolveNamed(row.events);
  const rsvps = row.sport_group_activity_rsvps;
  return {
    id: row.id,
    title: row.title,
    sport: row.sport,
    scheduledAt: new Date(row.scheduled_at),
    locationNote: row.location_note,
    lobbyId: row.lobby_id,
    createdByName: creator?.full_name ?? creator?.username ?? 'Crew member',
    destinationName: row.destination_name,
    destinationAddress: row.destination_address,
    parkingNote: row.parking_note,
    venueId: row.venue_id ?? venue?.id ?? null,
    venueName: venue?.name ?? null,
    eventId: row.event_id ?? event?.id ?? null,
    eventTitle: event?.title ?? null,
    goingCount: countGoing(rsvps),
  };
}

function mapGearClaim(row: GearClaimRow): GearClaimData {
  const profile = resolveProfile(row.profiles);
  return {
    item: row.item as GearItem,
    userId: row.user_id,
    name: profile?.full_name ?? profile?.username ?? 'Crew member',
  };
}

function mapGroupCard(group: GroupRow, viewerId: string, viewerRole: string): GroupCardData {
  const members = (group.sport_group_members ?? []).map(mapMemberPreview);
  const now = new Date();
  const upcomingActivities = (group.sport_group_activities ?? [])
    .filter((a) => new Date(a.scheduled_at) >= now)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  const nextRow = upcomingActivities[0] ?? null;

  return {
    id: group.id,
    name: group.name,
    sport: group.sport,
    description: group.description,
    inviteCode: group.invite_code,
    memberCount: members.length,
    members,
    nextActivityAt: nextRow ? new Date(nextRow.scheduled_at) : null,
    nextActivityTitle: nextRow?.title ?? null,
    nextActivityId: nextRow?.id ?? null,
    nextActivityCoordination: nextRow
      ? {
          goingCount: countGoing(nextRow.sport_group_activity_rsvps),
          locationNote: nextRow.location_note,
          destinationName: nextRow.destination_name,
          destinationAddress: nextRow.destination_address,
          parkingNote: nextRow.parking_note,
          venueId: nextRow.venue_id ?? null,
          eventId: nextRow.event_id ?? null,
        }
      : null,
    isOwner: group.owner_id === viewerId,
    viewerRole,
  };
}

export async function getMyGroups(profileId: string): Promise<GroupCardData[]> {
  const supabase = await createClient();

  const { data: memberships, error } = await supabase
    .from('sport_group_members')
    .select('group_id, role')
    .eq('user_id', profileId);

  if (error || !memberships?.length) {
    if (error && process.env.NODE_ENV !== 'production') console.error('[sport-groups.getMyGroups]', error.message);
    return [];
  }

  const groupIds = memberships.map((m) => m.group_id);
  const roleByGroup = new Map(memberships.map((m) => [m.group_id, m.role]));

  const { data: groups, error: groupsError } = await supabase
    .from('sport_groups')
    .select(
      `
      id,
      name,
      description,
      sport,
      invite_code,
      owner_id,
      created_at,
      sport_group_members (
        user_id,
        role,
        profiles ( id, full_name, username, avatar_url )
      ),
      sport_group_activities (
        id,
        title,
        scheduled_at,
        location_note,
        destination_name,
        destination_address,
        parking_note,
        venue_id,
        event_id,
        sport_group_activity_rsvps (
          user_id,
          status,
          paid
        )
      )
    `,
    )
    .in('id', groupIds)
    .order('created_at', { ascending: false });

  if (groupsError || !groups) return [];

  return (groups as GroupRow[]).map((group) =>
    mapGroupCard(group, profileId, roleByGroup.get(group.id) ?? 'member'),
  );
}

export async function getGroupById(id: string, viewerId: string): Promise<GroupDetailData | null> {
  const supabase = await createClient();

  const { data: membership, error: memberError } = await supabase
    .from('sport_group_members')
    .select('role')
    .eq('group_id', id)
    .eq('user_id', viewerId)
    .maybeSingle();

  if (memberError || !membership) return null;

  const { data, error } = await supabase
    .from('sport_groups')
    .select(
      `
      id,
      name,
      description,
      sport,
      invite_code,
      owner_id,
      created_at,
      profiles!sport_groups_owner_id_fkey ( id, full_name, username, avatar_url ),
      sport_group_members (
        user_id,
        role,
        joined_at,
        profiles ( id, full_name, username, avatar_url )
      ),
      sport_group_activities (
        id,
        title,
        sport,
        scheduled_at,
        location_note,
        lobby_id,
        destination_name,
        destination_address,
        parking_note,
        venue_id,
        event_id,
        profiles!sport_group_activities_created_by_id_fkey ( full_name, username ),
        venues ( id, name ),
        events ( id, title ),
        sport_group_activity_rsvps ( user_id, status, paid )
      )
    `,
    )
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    if (error && process.env.NODE_ENV !== 'production') console.error('[sport-groups.getGroupById]', error.message);
    return null;
  }

  const group = data as GroupRow;
  const owner = resolveProfile(group.profiles);
  const members = (group.sport_group_members ?? [])
    .map((m) => mapMember(m, group.owner_id))
    .sort((a, b) => {
      if (a.isOwner !== b.isOwner) return a.isOwner ? -1 : 1;
      return a.joinedAt.getTime() - b.joinedAt.getTime();
    });

  const activities = (group.sport_group_activities ?? [])
    .map(mapActivity)
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

  const [leaderboard, recurringSchedules] = await Promise.all([
    getLeaderboardData(supabase, id, members),
    getRecurringSchedules(supabase, id),
  ]);

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    sport: group.sport,
    inviteCode: group.invite_code,
    createdAt: new Date(group.created_at),
    ownerId: group.owner_id,
    ownerName: owner?.full_name ?? owner?.username ?? 'Owner',
    members,
    activities,
    leaderboard,
    recurringSchedules,
    isOwner: group.owner_id === viewerId,
    viewerRole: membership.role,
  };
}

type TypedSupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function getLeaderboardData(
  supabase: TypedSupabaseClient,
  groupId: string,
  members: GroupMemberData[],
): Promise<MemberStatData[]> {
  const { data: statRows } = await supabase
    .from('sport_group_member_stats')
    .select('user_id, points, sessions_attended, sessions_declined, wins')
    .eq('group_id', groupId);

  const statByUser = new Map(((statRows as MemberStatRow[] | null) ?? []).map((row) => [row.user_id, row]));

  const combined = members.map((member) => {
    const stat = statByUser.get(member.id);
    return {
      userId: member.id,
      name: member.name,
      avatarUrl: member.avatarUrl,
      points: stat?.points ?? 0,
      sessionsAttended: stat?.sessions_attended ?? 0,
      sessionsDeclined: stat?.sessions_declined ?? 0,
      wins: stat?.wins ?? 0,
    };
  });

  return buildLeaderboard(combined);
}

async function getRecurringSchedules(supabase: TypedSupabaseClient, groupId: string): Promise<RecurringScheduleData[]> {
  const { data } = await supabase
    .from('sport_group_recurring_schedules')
    .select('id, title, sport, day_of_week, time_of_day, location_note, is_active, last_generated_at')
    .eq('group_id', groupId)
    .order('day_of_week', { ascending: true });

  return ((data as RecurringScheduleRow[] | null) ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    sport: row.sport,
    dayOfWeek: row.day_of_week,
    timeOfDay: row.time_of_day,
    locationNote: row.location_note,
    isActive: row.is_active,
    lastGeneratedAt: row.last_generated_at ? new Date(row.last_generated_at) : null,
  }));
}

/**
 * Recomputes a member's crew stats by recounting their RSVP history for the
 * group (idempotent — safe to call after every RSVP change instead of
 * tracking deltas). `points` is a simple `sessionsAttended * 10` formula.
 */
export async function recomputeMemberStats(
  supabase: TypedSupabaseClient,
  groupId: string,
  userId: string,
): Promise<void> {
  const { data: activityIdRows } = await supabase.from('sport_group_activities').select('id').eq('group_id', groupId);
  const activityIds = (activityIdRows ?? []).map((row: { id: string }) => row.id);

  if (activityIds.length === 0) {
    await supabase
      .from('sport_group_member_stats')
      .upsert({ group_id: groupId, user_id: userId, points: 0, sessions_attended: 0, sessions_declined: 0 }, { onConflict: 'group_id,user_id' });
    return;
  }

  const { data: rsvpRows } = await supabase
    .from('sport_group_activity_rsvps')
    .select('status')
    .eq('user_id', userId)
    .in('activity_id', activityIds);

  const rows = (rsvpRows ?? []) as { status: string }[];
  const sessionsAttended = rows.filter((r) => r.status === 'going').length;
  const sessionsDeclined = rows.filter((r) => r.status === 'declined').length;

  const { data: existing } = await supabase
    .from('sport_group_member_stats')
    .select('wins')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle();

  await supabase.from('sport_group_member_stats').upsert(
    {
      group_id: groupId,
      user_id: userId,
      points: sessionsAttended * 10,
      sessions_attended: sessionsAttended,
      sessions_declined: sessionsDeclined,
      wins: existing?.wins ?? 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'group_id,user_id' },
  );
}

export async function getSessionById(
  groupId: string,
  sessionId: string,
  viewerId: string,
): Promise<SessionDetailData | null> {
  const supabase = await createClient();

  const { data: membership, error: memberError } = await supabase
    .from('sport_group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', viewerId)
    .maybeSingle();

  if (memberError || !membership) return null;

  const { data: group, error: groupError } = await supabase
    .from('sport_groups')
    .select(
      `
      id,
      name,
      owner_id,
      sport_group_members (
        user_id,
        role,
        joined_at,
        profiles ( id, full_name, username, avatar_url )
      )
    `,
    )
    .eq('id', groupId)
    .maybeSingle();

  if (groupError || !group) return null;

  const groupRow = group as GroupRow;
  const members = (groupRow.sport_group_members ?? [])
    .map((m) => mapMember(m, groupRow.owner_id))
    .sort((a, b) => {
      if (a.isOwner !== b.isOwner) return a.isOwner ? -1 : 1;
      return a.joinedAt.getTime() - b.joinedAt.getTime();
    });

  const { data: activity, error: activityError } = await supabase
    .from('sport_group_activities')
    .select(
      `
      id,
      group_id,
      title,
      sport,
      scheduled_at,
      location_note,
      lobby_id,
      destination_name,
      destination_address,
      parking_note,
      venue_id,
      event_id,
      open_to_mercenaries,
      spots_needed,
      mercenary_lobby_id,
      venues ( id, name ),
      events ( id, title ),
      profiles!sport_group_activities_created_by_id_fkey ( full_name, username ),
      sport_group_activity_rsvps (
        user_id,
        status,
        paid,
        profiles ( id, full_name, username, avatar_url )
      ),
      sport_group_activity_gear_claims (
        activity_id,
        item,
        user_id,
        profiles ( id, full_name, username, avatar_url )
      )
    `,
    )
    .eq('id', sessionId)
    .eq('group_id', groupId)
    .maybeSingle();

  if (activityError || !activity) return null;

  const activityRow = activity as unknown as ActivityRow & { sport_group_activity_gear_claims?: GearClaimRow[] };
  const creator = resolveProfile(activityRow.profiles);
  const venue = resolveNamed(activityRow.venues);
  const event = resolveNamed(activityRow.events);
  const gearClaims = (activityRow.sport_group_activity_gear_claims ?? []).map(mapGearClaim);
  const rsvpByUser = new Map(
    (activityRow.sport_group_activity_rsvps ?? []).map((r) => {
      const profile = resolveProfile(r.profiles);
      return [
        r.user_id,
        {
          userId: r.user_id,
          name: profile?.full_name ?? profile?.username ?? 'Player',
          avatarUrl: profile?.avatar_url ?? null,
          status: r.status as SessionRsvpStatus,
          paid: r.paid,
          isOwner: r.user_id === groupRow.owner_id,
        } satisfies SessionRsvpData,
      ];
    }),
  );

  const rsvps: SessionRsvpData[] = members.map((member) => {
    const existing = rsvpByUser.get(member.id);
    if (existing) return existing;
    return {
      userId: member.id,
      name: member.name,
      avatarUrl: member.avatarUrl,
      status: 'pending',
      paid: false,
      isOwner: member.isOwner,
    };
  });

  return {
    id: activityRow.id,
    groupId,
    groupName: groupRow.name,
    title: activityRow.title,
    sport: activityRow.sport,
    scheduledAt: new Date(activityRow.scheduled_at),
    locationNote: activityRow.location_note,
    lobbyId: activityRow.lobby_id,
    createdByName: creator?.full_name ?? creator?.username ?? 'Crew member',
    destinationName: activityRow.destination_name,
    destinationAddress: activityRow.destination_address,
    parkingNote: activityRow.parking_note,
    venueId: activityRow.venue_id ?? venue?.id ?? null,
    venueName: venue?.name ?? null,
    eventId: activityRow.event_id ?? event?.id ?? null,
    eventTitle: event?.title ?? null,
    members,
    rsvps,
    viewerId,
    isOwner: groupRow.owner_id === viewerId,
    gearClaims,
    openToMercenaries: activityRow.open_to_mercenaries ?? false,
    spotsNeeded: activityRow.spots_needed ?? null,
    mercenaryLobbyId: activityRow.mercenary_lobby_id ?? null,
  };
}

export async function getGroupActivities(groupId: string): Promise<GroupActivityData[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('sport_group_activities')
    .select(
      `
      id,
      title,
      sport,
      scheduled_at,
      location_note,
      lobby_id,
      destination_name,
      destination_address,
      parking_note,
      venue_id,
      event_id,
      venues ( id, name ),
      events ( id, title ),
      profiles!sport_group_activities_created_by_id_fkey ( full_name, username ),
      sport_group_activity_rsvps ( user_id, status, paid )
    `,
    )
    .eq('group_id', groupId)
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true });

  if (error || !data) return [];

  return (data as ActivityRow[]).map(mapActivity);
}

export interface BookingVenueOption {
  id: string;
  name: string;
}

export interface BookingEventOption {
  id: string;
  title: string;
  venueId: string | null;
}

export async function getBookingOptionsForCity(city: string): Promise<{
  venues: BookingVenueOption[];
  events: BookingEventOption[];
}> {
  const supabase = await createClient();

  const [{ data: venues }, { data: events }] = await Promise.all([
    supabase.from('venues').select('id, name').ilike('city', city).order('name', { ascending: true }).limit(24),
    supabase
      .from('events')
      .select('id, title, venue_id')
      .ilike('city', city)
      .in('status', ['open', 'live'])
      .gte('starts_at', activeFeedSinceIso())
      .order('starts_at', { ascending: true })
      .limit(24),
  ]);

  return {
    venues: (venues ?? []).map((v) => ({ id: v.id as string, name: v.name as string })),
    events: (events ?? []).map((e) => ({
      id: e.id as string,
      title: e.title as string,
      venueId: (e.venue_id as string | null) ?? null,
    })),
  };
}
