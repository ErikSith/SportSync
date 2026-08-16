import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

/**
 * DELETE /api/groups/[id] — owner (Admin) only.
 * Cascades members/activities via DB FKs when present; RLS also gates delete.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const groupId = params.id;

  const { data: group, error: groupError } = await supabase
    .from('sport_groups')
    .select('id, owner_id, name')
    .eq('id', groupId)
    .maybeSingle();

  if (groupError) {
    return NextResponse.json({ error: groupError.message }, { status: 500 });
  }

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  if (group.owner_id !== auth.user.id) {
    return NextResponse.json(
      { error: 'Only the crew admin can delete this group' },
      { status: 403 },
    );
  }

  const { error: deleteError } = await supabase
    .from('sport_groups')
    .delete()
    .eq('id', groupId)
    .eq('owner_id', auth.user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  revalidatePath('/lobby');
  revalidatePath(`/lobby/groups/${groupId}`);

  return NextResponse.json({ ok: true, deletedId: groupId, name: group.name });
}
