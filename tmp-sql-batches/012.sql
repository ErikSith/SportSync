INSERT INTO tournaments (
  name, description, sport, format, status, entry_fee, max_participants, current_participants,
  cover_url, city, latitude, longitude, starts_at, registration_deadline,
  venue_id, source, external_id, source_url, ticket_url, scraped_at, updated_at
) VALUES (
  'Detský Davis Cup a Fed Cup s Nadáciou SPP 2026', 'Detský Davis Cup a Fed Cup s Nadáciou SPP 2026. Turnaj / súťaž — možné sa zúčastniť (prihláška cez eTenis / ITF / TE). Súťaž do 8 rokov: prihlásené družstvá musia spracovať súpisky cez systém eTenis najneskôr do 20. 8. 2026. Súťaž do 10 rokov: postupujúce družstvá do regionálneho kola musia spracovať súpisku prostredníctvom systému eTenis najneskôr do 20. 8. 2026. Zdroj: stz.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (STZ – oficiálny web). https://www.stz.sk/tenis-deti/detsky-davis-cup-a-fed-cup-s-nadaciou-spp-2026', 'TENNIS', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN',
  0, 8, 0,
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1486, 17.1077, '2026-08-20T10:00:00.000Z'::timestamptz, '2026-08-20T10:00:00.000Z'::timestamptz,
  (SELECT id FROM venues WHERE name ILIKE 'Národné tenisové centrum Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'stz', 'tenis-deti-detsky-davis-cup-a-fed-cup-s-nadaciou-spp-2026', 'https://www.stz.sk/tenis-deti/detsky-davis-cup-a-fed-cup-s-nadaciou-spp-2026',
  'https://www.stz.sk/tenis-deti/detsky-davis-cup-a-fed-cup-s-nadaciou-spp-2026', now(), now()
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