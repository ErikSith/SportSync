INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Traja na jedného', 'Skupinové cvičenie Form Factory FitCamp — Traja na jedného. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-08T10:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-08T10:00:00.000Z-traja-na-jedneho', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
  'https://fitcamp.formfactory.sk/calendar', now(), 'participate', ARRAY[]::text[], false
)
ON CONFLICT (source, external_id) WHERE source IS NOT NULL AND external_id IS NOT NULL
DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  starts_at = EXCLUDED.starts_at,
  price_cents = EXCLUDED.price_cents,
  capacity = EXCLUDED.capacity,
  max_participants = EXCLUDED.max_participants,
  registered_count = EXCLUDED.registered_count,
  source_url = EXCLUDED.source_url,
  ticket_url = EXCLUDED.ticket_url,
  source_name = EXCLUDED.source_name,
  is_aggregated = true,
  scraped_at = now(),
  venue_id = COALESCE(EXCLUDED.venue_id, events.venue_id);