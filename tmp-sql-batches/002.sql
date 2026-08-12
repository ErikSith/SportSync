INSERT INTO tournaments (
  name, description, sport, format, status, entry_fee, max_participants, current_participants,
  cover_url, city, latitude, longitude, starts_at, registration_deadline,
  venue_id, source, external_id, source_url, ticket_url, scraped_at, updated_at
) VALUES (
  'Turnaj C kategorie - Mierne Pokročilí', 'Padel Knock Out turnaj — Turnaj C kategorie - Mierne Pokročilí. Kapacita 5/8, štartovné 50 €. Aurial Padel Bratislava (Bajkalská 7). Registrácia: aurialpadel.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Aurial Padel Club). https://aurialpadel.sk/tournament/turnaj-mierne-pokrocili-08082026', 'PADEL', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN',
  50, 8, 5,
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1486, 17.1077, '2026-08-08T10:00:00.000Z'::timestamptz, '2026-08-08T10:00:00.000Z'::timestamptz,
  (SELECT id FROM venues WHERE name ILIKE 'Aurial Padel Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'aurial-padel', 'aurialpadel-sk-tournament-turnaj-mierne-pokrocili-08082026', 'https://aurialpadel.sk/tournament/turnaj-mierne-pokrocili-08082026',
  'https://aurialpadel.sk/tournament/turnaj-mierne-pokrocili-08082026', now(), now()
)
ON CONFLICT (source, external_id) WHERE source IS NOT NULL AND external_id IS NOT NULL
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  starts_at = EXCLUDED.starts_at,
  entry_fee = EXCLUDED.entry_fee,
  max_participants = EXCLUDED.max_participants,
  current_participants = EXCLUDED.current_participants,
  source_url = EXCLUDED.source_url,
  ticket_url = EXCLUDED.ticket_url,
  scraped_at = now(),
  updated_at = now(),
  venue_id = COALESCE(EXCLUDED.venue_id, tournaments.venue_id);