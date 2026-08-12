
INSERT INTO venues (name, address, city, sports, latitude, longitude, website_url, verified)
SELECT v.name, v.address, v.city, v.sports, v.lat, v.lng, v.website, true
FROM (VALUES
  ('Aurial Padel Bratislava', 'Bajkalská 7, Bratislava', 'Bratislava', ARRAY['PADEL'], 48.1569, 17.1402, 'https://aurialpadel.sk/turnaje'),
  ('Aurial Padel Rača', 'Na Pántoch 8, Bratislava', 'Bratislava', ARRAY['PADEL'], 48.2045, 17.1508, 'https://aurialpadel.sk/turnaje'),
  ('Form Factory FitCamp', 'Drieňová 11/A, Bratislava', 'Bratislava', ARRAY['FITNESS'], 48.1562, 17.1475, 'https://fitcamp.formfactory.sk/calendar'),
  ('Form Factory Farského', 'Farského 14, Bratislava', 'Bratislava', ARRAY['FITNESS'], 48.1405, 17.1338, 'https://www.formfactory.sk/eventy/'),
  ('Form Factory OC Nivy', 'Mlynské nivy 16, Bratislava', 'Bratislava', ARRAY['FITNESS'], 48.1468, 17.1272, 'https://www.formfactory.sk/eventy/'),
  ('Form Factory BBC', 'Plynárenská 7/A, Bratislava', 'Bratislava', ARRAY['FITNESS'], 48.1422, 17.1285, 'https://www.formfactory.sk/eventy/'),
  ('Národné tenisové centrum Bratislava', 'Trnavská cesta, Bratislava', 'Bratislava', ARRAY['TENNIS'], 48.1655, 17.1368, 'https://www.ntc.sk/'),
  ('Eurovea (Dunaj)', 'Pribinova, Bratislava', 'Bratislava', ARRAY['FITNESS'], 48.1405, 17.1225, 'https://www.citylife.sk/tag/sport'),
  ('Grassalkovichova zahrada', 'Hodžovo námestie, Bratislava', 'Bratislava', ARRAY['FITNESS'], 48.1494, 17.1077, 'https://www.citylife.sk/tag/sport')
) AS v(name, address, city, sports, lat, lng, website)
WHERE NOT EXISTS (
  SELECT 1 FROM venues x WHERE x.city = v.city AND x.name ILIKE v.name
);


INSERT INTO tournaments (
  name, description, sport, format, status, entry_fee, max_participants, current_participants,
  cover_url, city, latitude, longitude, starts_at, registration_deadline,
  venue_id, source, external_id, source_url, ticket_url, scraped_at, updated_at
) VALUES (
  'Turnaj D kategorie - Začiatočníci', 'Padel Knock Out turnaj — Turnaj D kategorie - Začiatočníci. Kapacita 8/8, štartovné 50 €. Aurial Padel Bratislava (Bajkalská 7). Registrácia: aurialpadel.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Aurial Padel Club). https://aurialpadel.sk/tournament/turnaj-zaciatocnici-08082026', 'PADEL', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN',
  50, 8, 8,
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1486, 17.1077, '2026-08-08T10:00:00.000Z'::timestamptz, '2026-08-08T10:00:00.000Z'::timestamptz,
  (SELECT id FROM venues WHERE name ILIKE 'Aurial Padel Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'aurial-padel', 'aurialpadel-sk-tournament-turnaj-zaciatocnici-08082026', 'https://aurialpadel.sk/tournament/turnaj-zaciatocnici-08082026',
  'https://aurialpadel.sk/tournament/turnaj-zaciatocnici-08082026', now(), now()
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

INSERT INTO tournaments (
  name, description, sport, format, status, entry_fee, max_participants, current_participants,
  cover_url, city, latitude, longitude, starts_at, registration_deadline,
  venue_id, source, external_id, source_url, ticket_url, scraped_at, updated_at
) VALUES (
  'Turnaj B kategorie - Pokročilí', 'Padel Knock Out turnaj — Turnaj B kategorie - Pokročilí. Kapacita 0/8, štartovné 50 €. Aurial Padel Bratislava (Bajkalská 7). Registrácia: aurialpadel.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Aurial Padel Club). https://aurialpadel.sk/tournament/turnaj-pokrocili-08082026', 'PADEL', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN',
  50, 8, 0,
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1486, 17.1077, '2026-08-08T14:30:00.000Z'::timestamptz, '2026-08-08T14:30:00.000Z'::timestamptz,
  (SELECT id FROM venues WHERE name ILIKE 'Aurial Padel Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'aurial-padel', 'aurialpadel-sk-tournament-turnaj-pokrocili-08082026', 'https://aurialpadel.sk/tournament/turnaj-pokrocili-08082026',
  'https://aurialpadel.sk/tournament/turnaj-pokrocili-08082026', now(), now()
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

INSERT INTO tournaments (
  name, description, sport, format, status, entry_fee, max_participants, current_participants,
  cover_url, city, latitude, longitude, starts_at, registration_deadline,
  venue_id, source, external_id, source_url, ticket_url, scraped_at, updated_at
) VALUES (
  'Turnaj A kategorie - EXPERT', 'Padel Knock Out turnaj — Turnaj A kategorie - EXPERT. Kapacita 1/10, štartovné 0 €. Aurial Padel Bratislava (Bajkalská 7). Registrácia: aurialpadel.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Aurial Padel Club). https://aurialpadel.sk/tournament/turnaj-expert-08082026', 'PADEL', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN',
  0, 10, 1,
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1486, 17.1077, '2026-08-08T15:00:00.000Z'::timestamptz, '2026-08-08T15:00:00.000Z'::timestamptz,
  (SELECT id FROM venues WHERE name ILIKE 'Aurial Padel Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'aurial-padel', 'aurialpadel-sk-tournament-turnaj-expert-08082026', 'https://aurialpadel.sk/tournament/turnaj-expert-08082026',
  'https://aurialpadel.sk/tournament/turnaj-expert-08082026', now(), now()
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

INSERT INTO tournaments (
  name, description, sport, format, status, entry_fee, max_participants, current_participants,
  cover_url, city, latitude, longitude, starts_at, registration_deadline,
  venue_id, source, external_id, source_url, ticket_url, scraped_at, updated_at
) VALUES (
  'Turnaj D kategorie - Začiatočníci', 'Padel Knock Out turnaj — Turnaj D kategorie - Začiatočníci. Kapacita 8/8, štartovné 50 €. Aurial Padel Bratislava (Bajkalská 7). Registrácia: aurialpadel.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Aurial Padel Club). https://aurialpadel.sk/tournament/turnaj-zaciatocnici-09082026', 'PADEL', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN',
  50, 8, 8,
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1486, 17.1077, '2026-08-09T10:00:00.000Z'::timestamptz, '2026-08-09T10:00:00.000Z'::timestamptz,
  (SELECT id FROM venues WHERE name ILIKE 'Aurial Padel Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'aurial-padel', 'aurialpadel-sk-tournament-turnaj-zaciatocnici-09082026', 'https://aurialpadel.sk/tournament/turnaj-zaciatocnici-09082026',
  'https://aurialpadel.sk/tournament/turnaj-zaciatocnici-09082026', now(), now()
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

INSERT INTO tournaments (
  name, description, sport, format, status, entry_fee, max_participants, current_participants,
  cover_url, city, latitude, longitude, starts_at, registration_deadline,
  venue_id, source, external_id, source_url, ticket_url, scraped_at, updated_at
) VALUES (
  'Turnaj C kategorie - Mierne Pokročilí', 'Padel Knock Out turnaj — Turnaj C kategorie - Mierne Pokročilí. Kapacita 2/8, štartovné 50 €. Aurial Padel Bratislava (Bajkalská 7). Registrácia: aurialpadel.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Aurial Padel Club). https://aurialpadel.sk/tournament/turnaj-mierne-pokrocili-09082026', 'PADEL', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN',
  50, 8, 2,
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1486, 17.1077, '2026-08-09T10:00:00.000Z'::timestamptz, '2026-08-09T10:00:00.000Z'::timestamptz,
  (SELECT id FROM venues WHERE name ILIKE 'Aurial Padel Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'aurial-padel', 'aurialpadel-sk-tournament-turnaj-mierne-pokrocili-09082026', 'https://aurialpadel.sk/tournament/turnaj-mierne-pokrocili-09082026',
  'https://aurialpadel.sk/tournament/turnaj-mierne-pokrocili-09082026', now(), now()
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

INSERT INTO tournaments (
  name, description, sport, format, status, entry_fee, max_participants, current_participants,
  cover_url, city, latitude, longitude, starts_at, registration_deadline,
  venue_id, source, external_id, source_url, ticket_url, scraped_at, updated_at
) VALUES (
  'Turnaj B kategorie - Pokročilí', 'Padel Knock Out turnaj — Turnaj B kategorie - Pokročilí. Kapacita 4/8, štartovné 50 €. Aurial Padel Bratislava (Bajkalská 7). Registrácia: aurialpadel.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Aurial Padel Club). https://aurialpadel.sk/tournament/turnaj-pokrocili-09082026', 'PADEL', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN',
  50, 8, 4,
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1486, 17.1077, '2026-08-09T14:30:00.000Z'::timestamptz, '2026-08-09T14:30:00.000Z'::timestamptz,
  (SELECT id FROM venues WHERE name ILIKE 'Aurial Padel Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'aurial-padel', 'aurialpadel-sk-tournament-turnaj-pokrocili-09082026', 'https://aurialpadel.sk/tournament/turnaj-pokrocili-09082026',
  'https://aurialpadel.sk/tournament/turnaj-pokrocili-09082026', now(), now()
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