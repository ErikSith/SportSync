import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { findCityByName } from '@/lib/cities';

export const runtime = 'edge';

const gpsSchema = z.object({
  source: z.literal('gps'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const citySchema = z.object({
  source: z.literal('city'),
  city: z.string().min(1),
});

const bodySchema = z.discriminatedUnion('source', [gpsSchema, citySchema]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid location payload', issues: parsed.error.issues }, { status: 400 });
  }

  const input = parsed.data;
  const update =
    input.source === 'city'
      ? (() => {
          const city = findCityByName(input.city);
          if (!city) return null;
          return { city: city.name, latitude: city.latitude, longitude: city.longitude };
        })()
      : { latitude: input.latitude, longitude: input.longitude };

  if (!update) {
    return NextResponse.json({ error: `Unsupported city "${input.source === 'city' ? input.city : ''}"` }, { status: 422 });
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', auth.user.id)
    .select('city, latitude, longitude')
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: 'Could not save location' }, { status: 500 });
  }

  return NextResponse.json({ profile });
}
