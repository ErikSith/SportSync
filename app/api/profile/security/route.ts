import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getProfileByAuthId, isPhoneNumberInUse, updateProfile } from '@/lib/data/profile';
import { normalizeSkPhone } from '@/lib/profile/verification';

export const runtime = 'edge';

const patchSchema = z.object({
  phoneNumber: z.string().nullable().optional(),
  syncFromAuth: z.boolean().optional(),
  is2faEnabled: z.boolean().optional(),
});

async function resolveAuthVerification(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return null;

  let is2faEnabled = false;
  try {
    const { data: factorsData, error: mfaError } = await supabase.auth.mfa.listFactors();
    if (!mfaError) {
      is2faEnabled = (factorsData?.totp ?? []).some((f) => f.status === 'verified');
    }
  } catch {
    // MFA may be disabled on the Supabase project — non-fatal for contact updates.
  }

  return {
    user: auth.user,
    isEmailVerified: Boolean(auth.user.email_confirmed_at),
    is2faEnabled,
  };
}

export async function GET() {
  const supabase = await createClient();
  const authState = await resolveAuthVerification(supabase);
  if (!authState) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const profile = await getProfileByAuthId(authState.user.id);
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  // Keep verification flags in sync without requiring a PATCH on page load.
  if (
    profile.isEmailVerified !== authState.isEmailVerified ||
    profile.is2faEnabled !== authState.is2faEnabled
  ) {
    await updateProfile(authState.user.id, {
      isEmailVerified: authState.isEmailVerified,
      is2faEnabled: authState.is2faEnabled,
    });
  }

  const freshProfile = await getProfileByAuthId(authState.user.id);

  return NextResponse.json({
    profile: freshProfile ?? profile,
    auth: {
      email: authState.user.email ?? profile.email,
      isEmailVerified: authState.isEmailVerified,
      is2faEnabled: authState.is2faEnabled || profile.is2faEnabled,
    },
  });
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const authState = await resolveAuthVerification(supabase);
    if (!authState) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const json = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Neplatné údaje v požiadavke.' }, { status: 400 });
    }

    const updateInput: Parameters<typeof updateProfile>[1] = {};

    if (parsed.data.phoneNumber !== undefined) {
      if (parsed.data.phoneNumber === null || parsed.data.phoneNumber === '') {
        updateInput.phoneNumber = null;
        updateInput.isPhoneVerified = false;
      } else {
        const normalized = normalizeSkPhone(parsed.data.phoneNumber);
        if (!normalized) {
          return NextResponse.json(
            { error: 'Neplatné telefónne číslo. Použi formát +421 9XX XXX XXX.' },
            { status: 400 },
          );
        }
        const taken = await isPhoneNumberInUse(normalized, authState.user.id);
        if (taken) {
          return NextResponse.json(
            { error: 'Toto telefónne číslo je už zaregistrované na inom účte.' },
            { status: 409 },
          );
        }
        updateInput.phoneNumber = normalized;
        updateInput.isPhoneVerified = true;
      }
    }

    if (parsed.data.syncFromAuth) {
      updateInput.isEmailVerified = authState.isEmailVerified;
      updateInput.is2faEnabled = authState.is2faEnabled;
    }

    if (parsed.data.is2faEnabled !== undefined) {
      updateInput.is2faEnabled = parsed.data.is2faEnabled;
    }

    if (Object.keys(updateInput).length === 0) {
      const profile = await getProfileByAuthId(authState.user.id);
      return NextResponse.json({ profile });
    }

    const result = await updateProfile(authState.user.id, updateInput);
    if (!result.ok) {
      const status = result.error.includes('telefónne číslo') ? 409 : 500;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ profile: result.profile });
  } catch (err) {
    console.error('[profile/security PATCH]', err);
    return NextResponse.json(
      { error: 'Nepodarilo sa uložiť nastavenia. Skús to znova.' },
      { status: 500 },
    );
  }
}
