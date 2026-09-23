import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasValidServiceRoleKey } from '@/lib/db/service-role';
import { SWITCHABLE_ACCOUNTS } from '@/lib/demo/switchable-accounts';
import { isAuthBypassEnabled } from '@/lib/auth/demo-mode';

export const runtime = 'nodejs';

/**
 * Testing-only: mint a session for a switchable demo account without a password.
 * Allowed only when AUTH_BYPASS is on and the email is in SWITCHABLE_ACCOUNTS.
 */
export async function POST(request: Request) {
  if (!isAuthBypassEnabled()) {
    return NextResponse.json({ error: 'Demo switch disabled' }, { status: 403 });
  }

  if (!hasValidServiceRoleKey()) {
    return NextResponse.json({ error: 'Service role unavailable' }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase() ?? '';
  const allowed = SWITCHABLE_ACCOUNTS.some((a) => a.email.toLowerCase() === email);
  if (!email || !allowed) {
    return NextResponse.json({ error: 'Account not switchable' }, { status: 400 });
  }

  // Caller must already be signed in as another switchable account (or any user while bypass).
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const link = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    const tokenHash = link.data.properties?.hashed_token;
    if (link.error || !tokenHash) {
      return NextResponse.json(
        { error: link.error?.message ?? 'Could not mint switch session' },
        { status: 500 },
      );
    }

    const verified = await admin.auth.verifyOtp({
      type: 'email',
      token_hash: tokenHash,
    });

    const session = verified.data.session;
    if (verified.error || !session?.access_token || !session.refresh_token) {
      return NextResponse.json(
        { error: verified.error?.message ?? 'Could not verify switch session' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      email,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Switch failed' },
      { status: 500 },
    );
  }
}
