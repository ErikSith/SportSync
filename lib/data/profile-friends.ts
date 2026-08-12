import { createClient } from '@/lib/supabase/server';

export type FriendshipStatus = 'pending' | 'accepted' | 'declined';

export interface FriendProfileSnippet {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  city: string | null;
  karmaScore: number;
}

export interface FriendshipView {
  id: string;
  status: FriendshipStatus;
  requesterId: string;
  addresseeId: string;
  friend: FriendProfileSnippet;
  createdAt: Date;
}

export interface FriendRequestView {
  id: string;
  requester: FriendProfileSnippet;
  createdAt: Date;
}

export type FriendshipRelation =
  | 'none'
  | 'friends'
  | 'pending_outgoing'
  | 'pending_incoming'
  | 'declined';

interface ProfileSnippetRow {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  karma_score: number | string | null;
}

interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
}

function mapSnippet(row: ProfileSnippetRow): FriendProfileSnippet {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    city: row.city,
    karmaScore: Number(row.karma_score ?? 0),
  };
}

async function loadProfileSnippets(ids: string[]): Promise<Map<string, FriendProfileSnippet>> {
  if (ids.length === 0) return new Map();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, city, karma_score')
    .in('id', ids);

  const map = new Map<string, FriendProfileSnippet>();
  if (error || !data) return map;

  for (const row of data as ProfileSnippetRow[]) {
    map.set(row.id, mapSnippet(row));
  }
  return map;
}

export async function getFriends(profileId: string): Promise<FriendshipView[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status, created_at')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${profileId},addressee_id.eq.${profileId}`)
    .order('created_at', { ascending: false });

  if (error || !data?.length) return [];

  const rows = data as FriendshipRow[];
  const friendIds = rows.map((row) => (row.requester_id === profileId ? row.addressee_id : row.requester_id));
  const profiles = await loadProfileSnippets(friendIds);

  return rows
    .map((row) => {
      const friendId = row.requester_id === profileId ? row.addressee_id : row.requester_id;
      const friend = profiles.get(friendId);
      if (!friend) return null;
      return {
        id: row.id,
        status: row.status,
        requesterId: row.requester_id,
        addresseeId: row.addressee_id,
        friend,
        createdAt: new Date(row.created_at),
      } satisfies FriendshipView;
    })
    .filter((row): row is FriendshipView => row !== null);
}

export async function getIncomingFriendRequests(profileId: string): Promise<FriendRequestView[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('friendships')
    .select('id, requester_id, created_at')
    .eq('addressee_id', profileId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error || !data?.length) return [];

  const requesterIds = (data as { requester_id: string }[]).map((row) => row.requester_id);
  const profiles = await loadProfileSnippets(requesterIds);

  return (data as { id: string; requester_id: string; created_at: string }[])
    .map((row) => {
      const requester = profiles.get(row.requester_id);
      if (!requester) return null;
      return {
        id: row.id,
        requester,
        createdAt: new Date(row.created_at),
      } satisfies FriendRequestView;
    })
    .filter((row): row is FriendRequestView => row !== null);
}

export async function getFriendshipBetween(
  viewerId: string,
  targetId: string,
): Promise<{ id: string; status: FriendshipStatus; requesterId: string; addresseeId: string } | null> {
  if (viewerId === targetId) return null;

  const supabase = await createClient();

  const { data: forward } = await supabase
    .from('friendships')
    .select('id, status, requester_id, addressee_id')
    .eq('requester_id', viewerId)
    .eq('addressee_id', targetId)
    .maybeSingle();

  if (forward) {
    const row = forward as { id: string; status: FriendshipStatus; requester_id: string; addressee_id: string };
    return { id: row.id, status: row.status, requesterId: row.requester_id, addresseeId: row.addressee_id };
  }

  const { data: reverse } = await supabase
    .from('friendships')
    .select('id, status, requester_id, addressee_id')
    .eq('requester_id', targetId)
    .eq('addressee_id', viewerId)
    .maybeSingle();

  if (reverse) {
    const row = reverse as { id: string; status: FriendshipStatus; requester_id: string; addressee_id: string };
    return { id: row.id, status: row.status, requesterId: row.requester_id, addresseeId: row.addressee_id };
  }

  return null;
}

export function friendshipRelation(
  viewerId: string,
  targetId: string,
  friendship: { status: FriendshipStatus; requesterId: string; addresseeId: string } | null,
): FriendshipRelation {
  if (!friendship) return 'none';
  if (friendship.status === 'accepted') return 'friends';
  if (friendship.status === 'declined') return 'declined';
  if (friendship.requesterId === viewerId) return 'pending_outgoing';
  return 'pending_incoming';
}

export async function createFriendRequest(
  requesterId: string,
  username: string,
): Promise<{ friendship: FriendshipView } | { error: string; status: number }> {
  const supabase = await createClient();

  const { data: target, error: targetError } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, city, karma_score')
    .eq('username', username)
    .maybeSingle();

  if (targetError || !target) {
    return { error: 'User not found', status: 404 };
  }

  if (target.id === requesterId) {
    return { error: 'Cannot add yourself', status: 400 };
  }

  const existing = await getFriendshipBetween(requesterId, target.id);
  if (existing) {
    if (existing.status === 'accepted') return { error: 'Already friends', status: 409 };
    if (existing.status === 'pending') return { error: 'Request already pending', status: 409 };
    if (existing.status === 'declined') {
      await supabase.from('friendships').delete().eq('id', existing.id);
    }
  }

  const { data: created, error: createError } = await supabase
    .from('friendships')
    .insert({
      requester_id: requesterId,
      addressee_id: target.id,
      status: 'pending',
    })
    .select('id, requester_id, addressee_id, status, created_at')
    .single();

  if (createError || !created) {
    return { error: 'Could not send request', status: 500 };
  }

  return {
    friendship: {
      id: created.id,
      status: created.status as FriendshipStatus,
      requesterId: created.requester_id,
      addresseeId: created.addressee_id,
      friend: mapSnippet(target as ProfileSnippetRow),
      createdAt: new Date(created.created_at),
    },
  };
}

export async function acceptFriendRequest(profileId: string, friendshipId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId)
    .eq('addressee_id', profileId)
    .eq('status', 'pending');

  return !error;
}

export async function declineFriendRequest(profileId: string, friendshipId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'declined' })
    .eq('id', friendshipId)
    .eq('addressee_id', profileId)
    .eq('status', 'pending');

  return !error;
}

export async function deleteFriendship(profileId: string, friendshipId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId)
    .or(`requester_id.eq.${profileId},addressee_id.eq.${profileId}`);

  return !error;
}
