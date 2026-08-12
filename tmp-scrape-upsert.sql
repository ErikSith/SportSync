
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

INSERT INTO tournaments (
  name, description, sport, format, status, entry_fee, max_participants, current_participants,
  cover_url, city, latitude, longitude, starts_at, registration_deadline,
  venue_id, source, external_id, source_url, ticket_url, scraped_at, updated_at
) VALUES (
  'Turnaj Ženy - Zaciatocnicky & Mierne Pokrocile', 'Padel Knock Out turnaj — Turnaj Ženy - Zaciatocnicky & Mierne Pokrocile. Kapacita 0/8, štartovné 50 €. Aurial Padel Bratislava (Bajkalská 7). Registrácia: aurialpadel.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Aurial Padel Club). https://aurialpadel.sk/tournament/turnaj-zeny-zac-mier-pokrocile-09082026', 'PADEL', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN',
  50, 8, 0,
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1486, 17.1077, '2026-08-09T15:00:00.000Z'::timestamptz, '2026-08-09T15:00:00.000Z'::timestamptz,
  (SELECT id FROM venues WHERE name ILIKE 'Aurial Padel Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'aurial-padel', 'aurialpadel-sk-tournament-turnaj-zeny-zac-mier-pokrocile-09082026', 'https://aurialpadel.sk/tournament/turnaj-zeny-zac-mier-pokrocile-09082026',
  'https://aurialpadel.sk/tournament/turnaj-zeny-zac-mier-pokrocile-09082026', now(), now()
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
  'Turnaj Ženy - Pokročilé (v Rači)', 'Padel Knock Out turnaj — Turnaj Ženy - Pokročilé (v Rači). Kapacita 0/8, štartovné 50 €. Aurial Padel Rača. Registrácia: aurialpadel.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Aurial Padel Club). https://aurialpadel.sk/tournament/turnaj-zeny-pokrocile-30082026', 'PADEL', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN',
  50, 8, 0,
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1486, 17.1077, '2026-08-30T08:00:00.000Z'::timestamptz, '2026-08-30T08:00:00.000Z'::timestamptz,
  (SELECT id FROM venues WHERE name ILIKE 'Aurial Padel Rača' ORDER BY created_at NULLS LAST LIMIT 1), 'aurial-padel', 'aurialpadel-sk-tournament-turnaj-zeny-pokrocile-30082026', 'https://aurialpadel.sk/tournament/turnaj-zeny-pokrocile-30082026',
  'https://aurialpadel.sk/tournament/turnaj-zeny-pokrocile-30082026', now(), now()
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
  'Turnaj Ženy - Pokročilé (v Rači)', 'Padel Knock Out turnaj — Turnaj Ženy - Pokročilé (v Rači). Kapacita 0/8, štartovné 50 €. Aurial Padel Rača. Registrácia: aurialpadel.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Aurial Padel Club). https://aurialpadel.sk/tournament/turnaj-zeny-pokrocile-10102026', 'PADEL', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN',
  50, 8, 0,
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1486, 17.1077, '2026-10-10T12:00:00.000Z'::timestamptz, '2026-10-10T12:00:00.000Z'::timestamptz,
  (SELECT id FROM venues WHERE name ILIKE 'Aurial Padel Rača' ORDER BY created_at NULLS LAST LIMIT 1), 'aurial-padel', 'aurialpadel-sk-tournament-turnaj-zeny-pokrocile-10102026', 'https://aurialpadel.sk/tournament/turnaj-zeny-pokrocile-10102026',
  'https://aurialpadel.sk/tournament/turnaj-zeny-pokrocile-10102026', now(), now()
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
  'M SR družstiev MLÁDEŽE 2026', 'M SR družstiev MLÁDEŽE 2026. Turnaj / súťaž — možné sa zúčastniť (prihláška cez eTenis / ITF / TE). Nominované družstvá musia nanovo spracovať súpisky cez systém eTenis najneskôr do 6. 8. 2026. Názov súťaže zadajte M SR (viac info o spracovaní súpisky). Zdroj: stz.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (STZ – oficiálny web). https://www.stz.sk/druzstva/m-sr-druzstiev-mladeze-2026', 'TENNIS', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN',
  0, 8, 0,
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1486, 17.1077, '2026-08-06T10:00:00.000Z'::timestamptz, '2026-08-06T10:00:00.000Z'::timestamptz,
  (SELECT id FROM venues WHERE name ILIKE 'Národné tenisové centrum Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'stz', 'druzstva-m-sr-druzstiev-mladeze-2026', 'https://www.stz.sk/druzstva/m-sr-druzstiev-mladeze-2026',
  'https://www.stz.sk/druzstva/m-sr-druzstiev-mladeze-2026', now(), now()
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

INSERT INTO tournaments (
  name, description, sport, format, status, entry_fee, max_participants, current_participants,
  cover_url, city, latitude, longitude, starts_at, registration_deadline,
  venue_id, source, external_id, source_url, ticket_url, scraped_at, updated_at
) VALUES (
  'M SR družstiev SENIOROV 2026', 'M SR družstiev SENIOROV 2026. Turnaj / súťaž — možné sa zúčastniť (prihláška cez eTenis / ITF / TE). Prihlásené družstvá musia spracovať súpisku cez systém eTenis najneskôr do 2. 9. 2026. Zdroj: stz.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (STZ – oficiálny web). https://www.stz.sk/seniorsky-tenis/m-sr-druzstiev-seniorov-2026', 'TENNIS', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN',
  0, 8, 0,
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1486, 17.1077, '2026-09-02T10:00:00.000Z'::timestamptz, '2026-09-02T10:00:00.000Z'::timestamptz,
  (SELECT id FROM venues WHERE name ILIKE 'Národné tenisové centrum Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'stz', 'seniorsky-tenis-m-sr-druzstiev-seniorov-2026', 'https://www.stz.sk/seniorsky-tenis/m-sr-druzstiev-seniorov-2026',
  'https://www.stz.sk/seniorsky-tenis/m-sr-druzstiev-seniorov-2026', now(), now()
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
  'Medzinárodný turnaj TEJT 2 do 14 rokov v Humennom', 'Medzinárodný turnaj TEJT 2 do 14 rokov v Humennom. Turnaj / súťaž — možné sa zúčastniť (prihláška cez eTenis / ITF / TE). V týždni od 8. septembra 2026 sa na dvorcoch 1. TC Humenné uskutoční medzinárodný turnaj kategórie TEJT 2 chlapcov a dievčat do 14 rokov. Uzávierka prihlášok na turnaj je 11. augusta. Viac informácií o turnaji nájdete na stránke www.tenniseurope.org. Zdroj: stz.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (STZ – oficiálny web). https://www.stz.sk/tenis-doma/medzinarodny-turnaj-tejt-2-do-14-rokov-v-humennom-23', 'TENNIS', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN',
  0, 8, 0,
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Humenné', 48.1486, 17.1077, '2026-09-08T10:00:00.000Z'::timestamptz, '2026-09-08T10:00:00.000Z'::timestamptz,
  (SELECT id FROM venues WHERE name ILIKE 'Národné tenisové centrum Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'stz', 'tenis-doma-medzinarodny-turnaj-tejt-2-do-14-rokov-v-humennom-23', 'https://www.stz.sk/tenis-doma/medzinarodny-turnaj-tejt-2-do-14-rokov-v-humennom-23',
  'https://www.stz.sk/tenis-doma/medzinarodny-turnaj-tejt-2-do-14-rokov-v-humennom-23', now(), now()
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
  'Medzinárodné juniorské turnaje ITF J30 v Humennom', 'Medzinárodné juniorské turnaje ITF J30 v Humennom. Turnaj / súťaž — možné sa zúčastniť (prihláška cez eTenis / ITF / TE). V týždni od 24. augusta 2026 sa na dvorcoch TK Humenné odohrá medzinárodný juniorský turnaj kategórie ITF J30 chlapcov a dievčat do 18 rokov. Uzávierka prihlášok na podujatie je 4. augusta. Hneď po ňom bude nasledovať ďalší turnaj rovnakej kategórie, na ktorý sa dá prihlásiť do 1 Zdroj: stz.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (STZ – oficiálny web). https://www.stz.sk/tenis-doma/medzinarodne-juniorske-turnaje-itf-j30-v-humenno', 'TENNIS', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN',
  0, 8, 0,
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Humenné', 48.1486, 17.1077, '2026-08-24T10:00:00.000Z'::timestamptz, '2026-08-24T10:00:00.000Z'::timestamptz,
  (SELECT id FROM venues WHERE name ILIKE 'Národné tenisové centrum Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'stz', 'tenis-doma-medzinarodne-juniorske-turnaje-itf-j30-v-humennom-37', 'https://www.stz.sk/tenis-doma/medzinarodne-juniorske-turnaje-itf-j30-v-humennom-37',
  'https://www.stz.sk/tenis-doma/medzinarodne-juniorske-turnaje-itf-j30-v-humennom-37', now(), now()
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
  'HORKÝŽE SLÍŽE - ČAROVNÉ TOUR 2026 27.11.2026', 'HORKÝŽE SLÍŽE - ČAROVNÉ TOUR 2026 27.11.2026

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (NTC Bratislava). https://www.ntc.sk/podujatie/horkyze-slize-carovne-tour-2026.html', 'TENNIS', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN',
  0, 8, 0,
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1486, 17.1077, '2026-11-27T17:00:00.000Z'::timestamptz, '2026-11-27T17:00:00.000Z'::timestamptz,
  (SELECT id FROM venues WHERE name ILIKE 'Národné tenisové centrum Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'ntc-ba', 'ntc-ba-https-www-ntc-sk-podujatie-horkyze-slize-carovne-tour-2026-html-2026-11-2', 'https://www.ntc.sk/podujatie/horkyze-slize-carovne-tour-2026.html',
  'https://www.ntc.sk/podujatie/horkyze-slize-carovne-tour-2026.html', now(), now()
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
  'SARAH BRIGHTMAN 28.11.2026', 'SARAH BRIGHTMAN 28.11.2026

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (NTC Bratislava). https://www.ntc.sk/podujatie/sarah-brightman.html', 'TENNIS', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN',
  0, 8, 0,
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1486, 17.1077, '2026-11-28T17:00:00.000Z'::timestamptz, '2026-11-28T17:00:00.000Z'::timestamptz,
  (SELECT id FROM venues WHERE name ILIKE 'Národné tenisové centrum Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'ntc-ba', 'ntc-ba-https-www-ntc-sk-podujatie-sarah-brightman-html-2026-11-28', 'https://www.ntc.sk/podujatie/sarah-brightman.html',
  'https://www.ntc.sk/podujatie/sarah-brightman.html', now(), now()
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
  'K-POP Fever 01.12.2026', 'K-POP Fever 01.12.2026

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (NTC Bratislava). https://www.ntc.sk/podujatie/k-pop-fever.html', 'TENNIS', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN',
  0, 8, 0,
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1486, 17.1077, '2026-12-01T17:00:00.000Z'::timestamptz, '2026-12-01T17:00:00.000Z'::timestamptz,
  (SELECT id FROM venues WHERE name ILIKE 'Národné tenisové centrum Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'ntc-ba', 'ntc-ba-https-www-ntc-sk-podujatie-k-pop-fever-html-2026-12-01', 'https://www.ntc.sk/podujatie/k-pop-fever.html',
  'https://www.ntc.sk/podujatie/k-pop-fever.html', now(), now()
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
  'AL BANO & BAND - ALL THE GREATEST HITS 04.12.2026', 'AL BANO & BAND - ALL THE GREATEST HITS 04.12.2026

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (NTC Bratislava). https://www.ntc.sk/podujatie/al-bano-band-all-the-greatest-hits-live.html', 'TENNIS', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN',
  0, 8, 0,
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1486, 17.1077, '2026-12-04T17:00:00.000Z'::timestamptz, '2026-12-04T17:00:00.000Z'::timestamptz,
  (SELECT id FROM venues WHERE name ILIKE 'Národné tenisové centrum Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'ntc-ba', 'ntc-ba-https-www-ntc-sk-podujatie-al-bano-band-all-the-greatest-hits-live-html-2', 'https://www.ntc.sk/podujatie/al-bano-band-all-the-greatest-hits-live.html',
  'https://www.ntc.sk/podujatie/al-bano-band-all-the-greatest-hits-live.html', now(), now()
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Open Air — SKY PARK', 'Vezmi kamošov na obľúbené lekcie ZADARMO.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://formfactory.site/event/letoskypark',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-07T17:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'event-https-formfactory-site-event-letoskypark-2026-08-07', 'https://formfactory.site/event/letoskypark', 'Form Factory', true,
  'https://formfactory.site/event/letoskypark', now(), 'participate', ARRAY[]::text[], false
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Open Air — OC Nivy', 'Vezmi kamošov na obľúbené lekcie ZADARMO.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://formfactory.site/event/event-motyizv2',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-07T17:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory OC Nivy' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'event-https-formfactory-site-event-event-motyizv2-2026-08-07', 'https://formfactory.site/event/event-motyizv2', 'Form Factory', true,
  'https://formfactory.site/event/event-motyizv2', now(), 'participate', ARRAY[]::text[], false
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Open Air — Partizánska Lúka', 'Vezmi kamošov na obľúbené lekcie ZADARMO.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://formfactory.site/event/letneoutdooroveskupinovky',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-07T17:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'event-https-formfactory-site-event-letneoutdooroveskupinovky-2026-08-07', 'https://formfactory.site/event/letneoutdooroveskupinovky', 'Form Factory', true,
  'https://formfactory.site/event/letneoutdooroveskupinovky', now(), 'participate', ARRAY[]::text[], false
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Piatkovica — FARSKÉHO', 'Zažite nával endorfínov vďaka perfektnému mixu kardia, výbušnosti a sily. Unikátne challenges vás za doprovodu live DJ setu od DJ Moto vtiahnu do intenzívneho full body workoutu, ktorý na Slovensku nemá obdoby.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://www.formfactory.sk/piatkovica-bratislava-farskeho/',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-07T17:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory Farského' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'event-https-www-formfactory-sk-piatkovica-bratislava-farskeho-2026-08-07', 'https://www.formfactory.sk/piatkovica-bratislava-farskeho/', 'Form Factory', true,
  'https://formfactory.site/event/piatkovica-farskeho', now(), 'participate', ARRAY[]::text[], false
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Piatkovica — OC NIVY', 'Zažite nával endorfínov vďaka perfektnému mixu kardia, výbušnosti a sily. Unikátne challenges vás za doprovodu live DJ setu od DJ Moto vtiahnu do intenzívneho full body workoutu, ktorý na Slovensku nemá obdoby.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://www.formfactory.sk/piatkovica-bratislava-nivy/',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-21T17:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory OC Nivy' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'event-https-www-formfactory-sk-piatkovica-bratislava-nivy-2026-08-21', 'https://www.formfactory.sk/piatkovica-bratislava-nivy/', 'Form Factory', true,
  'https://www.formfactory.sk/piatkovica-bratislava-nivy/', now(), 'participate', ARRAY[]::text[], false
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Power Yoga', 'Skupinové cvičenie Form Factory FitCamp — Power Yoga. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-03T17:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-03T17:00:00.000Z-power-yoga', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Do Formy', 'Skupinové cvičenie Form Factory FitCamp — Do Formy. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-03T18:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-03T18:00:00.000Z-do-formy', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Sila a Kondícia', 'Skupinové cvičenie Form Factory FitCamp — Sila a Kondícia. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-03T18:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-03T18:00:00.000Z-sila-a-kondicia', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Spinning', 'Skupinové cvičenie Form Factory FitCamp — Spinning. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-03T18:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-03T18:00:00.000Z-spinning', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Do Formy', 'Skupinové cvičenie Form Factory FitCamp — Do Formy. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-04T06:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-04T06:00:00.000Z-do-formy', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Sila a Kondícia', 'Skupinové cvičenie Form Factory FitCamp — Sila a Kondícia. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-04T07:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-04T07:00:00.000Z-sila-a-kondicia', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Traja na jedného', 'Skupinové cvičenie Form Factory FitCamp — Traja na jedného. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-04T07:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-04T07:00:00.000Z-traja-na-jedneho', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'TRX', 'Skupinové cvičenie Form Factory FitCamp — TRX. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-04T07:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-04T07:00:00.000Z-trx', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Traja na jedného', 'Skupinové cvičenie Form Factory FitCamp — Traja na jedného. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-04T09:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-04T09:00:00.000Z-traja-na-jedneho', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Spinning', 'Skupinové cvičenie Form Factory FitCamp — Spinning. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-04T12:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-04T12:00:00.000Z-spinning', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Zdravý chrbát', 'Skupinové cvičenie Form Factory FitCamp — Zdravý chrbát. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-04T15:45:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-04T15:45:00.000Z-zdravy-chrbat', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Tabata', 'Skupinové cvičenie Form Factory FitCamp — Tabata. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-04T17:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-04T17:00:00.000Z-tabata', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Traja na jedného', 'Skupinové cvičenie Form Factory FitCamp — Traja na jedného. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-04T17:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-04T17:00:00.000Z-traja-na-jedneho', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Spinning', 'Skupinové cvičenie Form Factory FitCamp — Spinning. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-04T18:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-04T18:00:00.000Z-spinning', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'LATINOFIT', 'Skupinové cvičenie Form Factory FitCamp — LATINOFIT. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-04T18:05:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-04T18:05:00.000Z-latinofit', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Traja na jedného', 'Skupinové cvičenie Form Factory FitCamp — Traja na jedného. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-04T18:30:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-04T18:30:00.000Z-traja-na-jedneho', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Thai box pre pokročilých', 'Skupinové cvičenie Form Factory FitCamp — Thai box pre pokročilých. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-04T19:10:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-04T19:10:00.000Z-thai-box-pre-pokrocilych', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'RPM', 'Skupinové cvičenie Form Factory FitCamp — RPM. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-05T06:30:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-05T06:30:00.000Z-rpm', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Kruhový tréning', 'Skupinové cvičenie Form Factory FitCamp — Kruhový tréning. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-05T07:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-05T07:00:00.000Z-kruhovy-trening', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Sila a Kondícia', 'Skupinové cvičenie Form Factory FitCamp — Sila a Kondícia. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-05T07:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-05T07:00:00.000Z-sila-a-kondicia', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Traja na jedného', 'Skupinové cvičenie Form Factory FitCamp — Traja na jedného. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-05T07:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-05T07:00:00.000Z-traja-na-jedneho', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Traja na jedného', 'Skupinové cvičenie Form Factory FitCamp — Traja na jedného. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-05T08:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-05T08:00:00.000Z-traja-na-jedneho', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Traja na jedného', 'Skupinové cvičenie Form Factory FitCamp — Traja na jedného. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-05T09:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-05T09:00:00.000Z-traja-na-jedneho', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Pilates FC', 'Skupinové cvičenie Form Factory FitCamp — Pilates FC. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-05T16:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-05T16:00:00.000Z-pilates-fc', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Power Yoga', 'Skupinové cvičenie Form Factory FitCamp — Power Yoga. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-05T17:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-05T17:00:00.000Z-power-yoga', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Running Power Terasa', 'Skupinové cvičenie Form Factory FitCamp — Running Power Terasa. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-05T17:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-05T17:00:00.000Z-running-power-terasa', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Traja na jedného', 'Skupinové cvičenie Form Factory FitCamp — Traja na jedného. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-05T17:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-05T17:00:00.000Z-traja-na-jedneho', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Do Formy', 'Skupinové cvičenie Form Factory FitCamp — Do Formy. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-05T18:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-05T18:00:00.000Z-do-formy', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Sila a Kondícia', 'Skupinové cvičenie Form Factory FitCamp — Sila a Kondícia. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-05T18:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-05T18:00:00.000Z-sila-a-kondicia', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Spinning', 'Skupinové cvičenie Form Factory FitCamp — Spinning. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-05T18:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-05T18:00:00.000Z-spinning', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Traja na jedného', 'Skupinové cvičenie Form Factory FitCamp — Traja na jedného. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-05T18:30:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-05T18:30:00.000Z-traja-na-jedneho', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Thai box pre začiatočníkov', 'Skupinové cvičenie Form Factory FitCamp — Thai box pre začiatočníkov. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-05T19:10:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-05T19:10:00.000Z-thai-box-pre-zaciatocnikov', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Do Formy', 'Skupinové cvičenie Form Factory FitCamp — Do Formy. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-06T06:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-06T06:00:00.000Z-do-formy', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Sila a Kondícia', 'Skupinové cvičenie Form Factory FitCamp — Sila a Kondícia. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-06T07:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-06T07:00:00.000Z-sila-a-kondicia', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Traja na jedného', 'Skupinové cvičenie Form Factory FitCamp — Traja na jedného. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-06T07:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-06T07:00:00.000Z-traja-na-jedneho', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Traja na jedného', 'Skupinové cvičenie Form Factory FitCamp — Traja na jedného. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-06T09:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-06T09:00:00.000Z-traja-na-jedneho', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Spinning', 'Skupinové cvičenie Form Factory FitCamp — Spinning. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-06T12:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-06T12:00:00.000Z-spinning', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Zdravý chrbát', 'Skupinové cvičenie Form Factory FitCamp — Zdravý chrbát. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-06T16:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-06T16:00:00.000Z-zdravy-chrbat', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Tabata', 'Skupinové cvičenie Form Factory FitCamp — Tabata. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-06T17:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-06T17:00:00.000Z-tabata', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Traja na jedného', 'Skupinové cvičenie Form Factory FitCamp — Traja na jedného. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-06T17:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-06T17:00:00.000Z-traja-na-jedneho', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Spinning', 'Skupinové cvičenie Form Factory FitCamp — Spinning. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-06T18:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-06T18:00:00.000Z-spinning', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Traja na jedného', 'Skupinové cvičenie Form Factory FitCamp — Traja na jedného. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-06T18:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-06T18:00:00.000Z-traja-na-jedneho', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'LATINOFIT', 'Skupinové cvičenie Form Factory FitCamp — LATINOFIT. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-06T18:05:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-06T18:05:00.000Z-latinofit', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Running Tech Dráha', 'Skupinové cvičenie Form Factory FitCamp — Running Tech Dráha. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-06T18:30:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-06T18:30:00.000Z-running-tech-draha', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Thai box pre pokročilých', 'Skupinové cvičenie Form Factory FitCamp — Thai box pre pokročilých. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-06T19:10:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-06T19:10:00.000Z-thai-box-pre-pokrocilych', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'RPM', 'Skupinové cvičenie Form Factory FitCamp — RPM. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-07T06:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-07T06:00:00.000Z-rpm', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Sila a Kondícia', 'Skupinové cvičenie Form Factory FitCamp — Sila a Kondícia. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-07T07:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-07T07:00:00.000Z-sila-a-kondicia', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Traja na jedného', 'Skupinové cvičenie Form Factory FitCamp — Traja na jedného. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-07T07:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-07T07:00:00.000Z-traja-na-jedneho', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'TRX', 'Skupinové cvičenie Form Factory FitCamp — TRX. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-07T07:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-07T07:00:00.000Z-trx', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Traja na jedného', 'Skupinové cvičenie Form Factory FitCamp — Traja na jedného. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-07T08:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-07T08:00:00.000Z-traja-na-jedneho', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Traja na jedného', 'Skupinové cvičenie Form Factory FitCamp — Traja na jedného. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-07T09:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-07T09:00:00.000Z-traja-na-jedneho', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Traja na jedného', 'Skupinové cvičenie Form Factory FitCamp — Traja na jedného. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-07T17:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-07T17:00:00.000Z-traja-na-jedneho', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Do Formy', 'Skupinové cvičenie Form Factory FitCamp — Do Formy. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-07T18:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-07T18:00:00.000Z-do-formy', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Traja na jedného', 'Skupinové cvičenie Form Factory FitCamp — Traja na jedného. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-07T18:30:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-07T18:30:00.000Z-traja-na-jedneho', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Traja na jedného', 'Skupinové cvičenie Form Factory FitCamp — Traja na jedného. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-08T07:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-08T07:00:00.000Z-traja-na-jedneho', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Spinning', 'Skupinové cvičenie Form Factory FitCamp — Spinning. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-08T09:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-08T09:00:00.000Z-spinning', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Tabata', 'Skupinové cvičenie Form Factory FitCamp — Tabata. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-08T09:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-08T09:00:00.000Z-tabata', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Traja na jedného', 'Skupinové cvičenie Form Factory FitCamp — Traja na jedného. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-09T07:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-09T07:00:00.000Z-traja-na-jedneho', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Power Yoga', 'Skupinové cvičenie Form Factory FitCamp — Power Yoga. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-09T09:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-09T09:00:00.000Z-power-yoga', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'RPM', 'Skupinové cvičenie Form Factory FitCamp — RPM. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-09T09:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-09T09:00:00.000Z-rpm', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Traja na jedného', 'Skupinové cvičenie Form Factory FitCamp — Traja na jedného. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-09T10:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-09T10:00:00.000Z-traja-na-jedneho', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Pilates FC', 'Skupinové cvičenie Form Factory FitCamp — Pilates FC. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-09T16:30:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-09T16:30:00.000Z-pilates-fc', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Do Formy', 'Skupinové cvičenie Form Factory FitCamp — Do Formy. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-09T18:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-09T18:00:00.000Z-do-formy', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Balans joga', 'Balans joga. Ranné skupinové cvičenie balans jógy každý utorok o 7:30 na schodoch pri Dunaji. 4.8.2026 - 25.8.2026 / Eurovea. Otvorená športová aktivita — môžeš sa zúčastniť. Zdroj: citylife.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (CityLife). https://www.citylife.sk/ina-akcia/balans-joga-eurovea-bratislava',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-04T07:30:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Eurovea (Dunaj)' ORDER BY created_at NULLS LAST LIMIT 1),
  'citylife', 'ina-akcia-balans-joga-eurovea-bratislava', 'https://www.citylife.sk/ina-akcia/balans-joga-eurovea-bratislava', 'CityLife', true,
  'https://www.citylife.sk/ina-akcia/balans-joga-eurovea-bratislava', now(), 'participate', ARRAY[]::text[], false
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Barre na Dunaji', 'Barre na Dunaji.  5.8.2026 - 26.8.2026 / Eurovea. Otvorená športová aktivita — môžeš sa zúčastniť. Zdroj: citylife.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (CityLife). https://www.citylife.sk/ina-akcia/barre-na-dunaji',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-05T07:30:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Eurovea (Dunaj)' ORDER BY created_at NULLS LAST LIMIT 1),
  'citylife', 'ina-akcia-barre-na-dunaji', 'https://www.citylife.sk/ina-akcia/barre-na-dunaji', 'CityLife', true,
  'https://www.citylife.sk/ina-akcia/barre-na-dunaji', now(), 'participate', ARRAY[]::text[], false
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Ranné cvičenie s InstaGym', 'Ranné cvičenie s InstaGym. Ranné skupinové cvičenie pod vedením trénerov Instagym každý štvrtok o 7:30 na schodoch pri Dunaji. 6.8.2026 - 27.8.2026 / Eurovea. Otvorená športová aktivita — môžeš sa zúčastniť. Zdroj: citylife.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (CityLife). https://www.citylife.sk/ina-akcia/ranne-letne-cvicenia-s-instagym-pri-dunaji',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-06T07:30:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Eurovea (Dunaj)' ORDER BY created_at NULLS LAST LIMIT 1),
  'citylife', 'ina-akcia-ranne-letne-cvicenia-s-instagym-pri-dunaji', 'https://www.citylife.sk/ina-akcia/ranne-letne-cvicenia-s-instagym-pri-dunaji', 'CityLife', true,
  'https://www.citylife.sk/ina-akcia/ranne-letne-cvicenia-s-instagym-pri-dunaji', now(), 'participate', ARRAY[]::text[], false
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Letné cvičenia', 'Letné cvičenia.  2.7.2026 - 31.8.2026 / Grassalkovichova záhrada. Otvorená športová aktivita — môžeš sa zúčastniť. Zdroj: citylife.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (CityLife). https://www.citylife.sk/ina-akcia/letne-cvicenia',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-04T07:30:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Grassalkovichova zahrada' ORDER BY created_at NULLS LAST LIMIT 1),
  'citylife', 'ina-akcia-letne-cvicenia', 'https://www.citylife.sk/ina-akcia/letne-cvicenia', 'CityLife', true,
  'https://www.citylife.sk/ina-akcia/letne-cvicenia', now(), 'participate', ARRAY[]::text[], false
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'OTHER', 'OTHER'::"SportType", 'Letná Škola korčuľovania s Decathlon', 'Letná Škola korčuľovania s Decathlon.  5.8.2026 - 26.8.2026 / Eurovea. Otvorená športová aktivita — môžeš sa zúčastniť. Zdroj: citylife.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (CityLife). https://kidstown.citylife.sk/ina-akcia/skola-korculovania-s-decathlonom',
  'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80', 'Bratislava', '2026-08-05T07:30:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Eurovea (Dunaj)' ORDER BY created_at NULLS LAST LIMIT 1),
  'citylife', 'kidstown-citylife-sk-ina-akcia-skola-korculovania-s-decathlonom', 'https://kidstown.citylife.sk/ina-akcia/skola-korculovania-s-decathlonom', 'CityLife', true,
  'https://kidstown.citylife.sk/ina-akcia/skola-korculovania-s-decathlonom', now(), 'participate', ARRAY[]::text[], false
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Ranné cvičenie s Gymstick', 'Ranné cvičenie s Gymstick.  7.8.2026 - 28.8.2026 / Eurovea. Otvorená športová aktivita — môžeš sa zúčastniť. Zdroj: citylife.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (CityLife). https://www.citylife.sk/ina-akcia/ranne-cvicenie-s-gymstick',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-07T07:30:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Eurovea (Dunaj)' ORDER BY created_at NULLS LAST LIMIT 1),
  'citylife', 'ina-akcia-ranne-cvicenie-s-gymstick', 'https://www.citylife.sk/ina-akcia/ranne-cvicenie-s-gymstick', 'CityLife', true,
  'https://www.citylife.sk/ina-akcia/ranne-cvicenie-s-gymstick', now(), 'participate', ARRAY[]::text[], false
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'TENNIS', 'TENNIS'::"SportType", 'DC: Vstupenky sú už v predaji!', 'Davis Cup — vstupenky pre divákov. NTC Košice. Zdroj: stz.sk / predpredaj.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (STZ – oficiálny web). https://www.stz.sk/davis-cup/dc-vstupenky-su-uz-v-predaji-99',
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Košice', '2026-09-19T12:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'stz', 'dc-tickets-davis-cup-dc-vstupenky-su-uz-v-predaji-99', 'https://www.stz.sk/davis-cup/dc-vstupenky-su-uz-v-predaji-99', 'STZ – oficiálny web', true,
  'https://predpredaj.zoznam.sk/sk/listky/davis-cup-slovensko-grecko-2026/', now(), 'spectator', ARRAY[]::text[], false
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'COMBAT', 'OTHER'::"SportType", 'NOC GLADIÁTOROV XIII', 'NOC GLADIÁTOROV XIII. Vstupenky pre divákov — 17.10.2026 16:00. Miesto: Športová hala, A. H. Škultétyho 1293, 990 01 Veľký Krtíš. Zdroj: predpredaj.zoznam.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Predpredaj.sk). https://predpredaj.zoznam.sk/sk/listky/noc-gladiatorov-xiii-2026-10-17/',
  'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80', 'Veľký Krtíš', '2026-10-17T16:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'predpredaj', 'sk-listky-noc-gladiatorov-xiii-2026-10-17', 'https://predpredaj.zoznam.sk/sk/listky/noc-gladiatorov-xiii-2026-10-17/', 'Predpredaj.sk', true,
  'https://predpredaj.zoznam.sk/sk/listky/noc-gladiatorov-xiii-2026-10-17/', now(), 'spectator', ARRAY[]::text[], false
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FOOTBALL', 'FOOTBALL'::"SportType", 'FC Spartak Trnava - Permanentka 2026/27', 'FC Spartak Trnava - Permanentka 2026/27. Vstupenky pre divákov — Sezóna 2026/27. Miesto: Štadión Antona Malatinského, City Arena Trnava. Zdroj: predpredaj.zoznam.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Predpredaj.sk). https://predpredaj.zoznam.sk/sk/presale/fc-spartak-trnava-permanentka-sezona-202627/',
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80', 'Trnava', '2026-08-17T18:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'predpredaj', 'sk-presale-fc-spartak-trnava-permanentka-sezona-202627', 'https://predpredaj.zoznam.sk/sk/presale/fc-spartak-trnava-permanentka-sezona-202627/', 'Predpredaj.sk', true,
  'https://predpredaj.zoznam.sk/sk/presale/fc-spartak-trnava-permanentka-sezona-202627/', now(), 'spectator', ARRAY[]::text[], false
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'HOCKEY', 'OTHER'::"SportType", 'Fight Night Challenge 12', 'Fight Night Challenge 12. Vstupenky pre divákov — 12.12.2026 18:00. Miesto: TIPOS Aréna - Zimný štadión Ondreja Nepelu, Odbojárov 9, 831 04 Bratislava. Zdroj: predpredaj.zoznam.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Predpredaj.sk). https://predpredaj.zoznam.sk/sk/listky/fight-night-challenge-12-2026-12-12/',
  'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80', 'Bratislava', '2026-12-12T18:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'predpredaj', 'sk-listky-fight-night-challenge-12-2026-12-12', 'https://predpredaj.zoznam.sk/sk/listky/fight-night-challenge-12-2026-12-12/', 'Predpredaj.sk', true,
  'https://predpredaj.zoznam.sk/sk/listky/fight-night-challenge-12-2026-12-12/', now(), 'spectator', ARRAY[]::text[], false
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'OTHER', 'OTHER'::"SportType", 'Keď chutí pomáhať', 'Keď chutí pomáhať. Registrácia / účasť — 12.09.2026 09:00. Miesto: RIVER PARK, Dvořákovo nábrežie 4 - 10, 811 02 Bratislava. Zdroj: predpredaj.zoznam.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Predpredaj.sk). https://predpredaj.zoznam.sk/sk/registracie/ked-chuti-pomahat/',
  'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80', 'Bratislava', '2026-09-12T09:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'predpredaj', 'sk-registracie-ked-chuti-pomahat', 'https://predpredaj.zoznam.sk/sk/registracie/ked-chuti-pomahat/', 'Predpredaj.sk', true,
  'https://predpredaj.zoznam.sk/sk/registracie/ked-chuti-pomahat/', now(), 'participate', ARRAY[]::text[], false
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FOOTBALL', 'FOOTBALL'::"SportType", 'FC Košice - Permanentka 26/27', 'FC Košice - Permanentka 26/27. Vstupenky pre divákov — Sezóna 2026/27. Miesto: Košická Futbalová Aréna, Pri prachárni 13, 040 11 Košice. Zdroj: predpredaj.zoznam.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Predpredaj.sk). https://predpredaj.zoznam.sk/sk/listky/fc-kosice-permanentka-2627/',
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80', 'Košice', '2026-08-17T18:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'predpredaj', 'sk-listky-fc-kosice-permanentka-2627', 'https://predpredaj.zoznam.sk/sk/listky/fc-kosice-permanentka-2627/', 'Predpredaj.sk', true,
  'https://predpredaj.zoznam.sk/sk/listky/fc-kosice-permanentka-2627/', now(), 'spectator', ARRAY[]::text[], false
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'HANDBALL', 'OTHER'::"SportType", 'Králi ulice XI', 'Králi ulice XI. Vstupenky pre divákov — 29.08.2026 19:00. Miesto: Hádzanárska hala S.Šipoša, Alejová 2, 04011 Košice. Zdroj: predpredaj.zoznam.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Predpredaj.sk). https://predpredaj.zoznam.sk/sk/listky/krali-ulice-xi-2026-08-29/',
  'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80', 'Košice', '2026-08-29T19:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'predpredaj', 'sk-listky-krali-ulice-xi-2026-08-29', 'https://predpredaj.zoznam.sk/sk/listky/krali-ulice-xi-2026-08-29/', 'Predpredaj.sk', true,
  'https://predpredaj.zoznam.sk/sk/listky/krali-ulice-xi-2026-08-29/', now(), 'spectator', ARRAY[]::text[], false
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FOOTBALL', 'FOOTBALL'::"SportType", 'FC Tatran Prešov - Permanentka 2026/27', 'FC Tatran Prešov - Permanentka 2026/27. Vstupenky pre divákov — Sezóna 2026/27. Miesto: FUTBAL TATRAN ARÉNA, Čapajevova 49, 080 01 Prešov. Zdroj: predpredaj.zoznam.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Predpredaj.sk). https://predpredaj.zoznam.sk/sk/listky/fc-tatran-presov-permanentka-202627/',
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80', 'Prešov', '2026-08-17T18:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'predpredaj', 'sk-listky-fc-tatran-presov-permanentka-202627', 'https://predpredaj.zoznam.sk/sk/listky/fc-tatran-presov-permanentka-202627/', 'Predpredaj.sk', true,
  'https://predpredaj.zoznam.sk/sk/listky/fc-tatran-presov-permanentka-202627/', now(), 'spectator', ARRAY[]::text[], false
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FOOTBALL', 'FOOTBALL'::"SportType", 'FC TATRAN Prešov - MFK TATRAN Liptovský Mikuláš', 'FC TATRAN Prešov - MFK TATRAN Liptovský Mikuláš. Vstupenky pre divákov — 08.08.2026 16:00. Miesto: FUTBAL TATRAN ARÉNA, Čapajevova 49, 080 01 Prešov. Zdroj: predpredaj.zoznam.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Predpredaj.sk). https://predpredaj.zoznam.sk/sk/listky/fc-tatran-presov-mfk-tatran-liptovsky-mikulas-2026-08-08/',
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80', 'Prešov', '2026-08-08T16:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'predpredaj', 'sk-listky-fc-tatran-presov-mfk-tatran-liptovsky-mikulas-2026-08-08', 'https://predpredaj.zoznam.sk/sk/listky/fc-tatran-presov-mfk-tatran-liptovsky-mikulas-2026-08-08/', 'Predpredaj.sk', true,
  'https://predpredaj.zoznam.sk/sk/listky/fc-tatran-presov-mfk-tatran-liptovsky-mikulas-2026-08-08/', now(), 'spectator', ARRAY[]::text[], false
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FOOTBALL', 'FOOTBALL'::"SportType", 'FC Spartak Trnava - MFK Dukla Banská Bystrica', 'FC Spartak Trnava - MFK Dukla Banská Bystrica. Vstupenky pre divákov — 08.08.2026 20:30. Miesto: Štadión Antona Malatinského, City Arena Trnava. Zdroj: predpredaj.zoznam.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Predpredaj.sk). https://predpredaj.zoznam.sk/sk/listky/fc-spartak-trnava-mfk-dukla-banska-bystrica-2026-08-08/',
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80', 'Trnava', '2026-08-08T20:30:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'predpredaj', 'sk-listky-fc-spartak-trnava-mfk-dukla-banska-bystrica-2026-08-08', 'https://predpredaj.zoznam.sk/sk/listky/fc-spartak-trnava-mfk-dukla-banska-bystrica-2026-08-08/', 'Predpredaj.sk', true,
  'https://predpredaj.zoznam.sk/sk/listky/fc-spartak-trnava-mfk-dukla-banska-bystrica-2026-08-08/', now(), 'spectator', ARRAY[]::text[], false
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FOOTBALL', 'FOOTBALL'::"SportType", 'FC TATRAN FAMILY', 'FC TATRAN FAMILY. Vstupenky pre divákov — Sezóna 2026/27. Miesto: FUTBAL TATRAN ARÉNA, Čapajevova 49, 080 01 Prešov. Zdroj: predpredaj.zoznam.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Predpredaj.sk). https://predpredaj.zoznam.sk/sk/listky/fc-tatran-family-2026-2027/',
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80', 'Prešov', '2026-08-17T18:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'predpredaj', 'sk-listky-fc-tatran-family-2026-2027', 'https://predpredaj.zoznam.sk/sk/listky/fc-tatran-family-2026-2027/', 'Predpredaj.sk', true,
  'https://predpredaj.zoznam.sk/sk/listky/fc-tatran-family-2026-2027/', now(), 'spectator', ARRAY[]::text[], false
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FOOTBALL', 'FOOTBALL'::"SportType", 'FC Petržalka - Permanentka 2026/27', 'FC Petržalka - Permanentka 2026/27. Vstupenky pre divákov — Sezóna 2026/27. Miesto: M. C. Sklodowskej 1, 851 04 Bratislava - Petržalka. Zdroj: predpredaj.zoznam.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Predpredaj.sk). https://predpredaj.zoznam.sk/sk/listky/fc-petrzalka-permanentka-202627/',
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80', 'Bratislava', '2026-08-17T18:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'predpredaj', 'sk-listky-fc-petrzalka-permanentka-202627', 'https://predpredaj.zoznam.sk/sk/listky/fc-petrzalka-permanentka-202627/', 'Predpredaj.sk', true,
  'https://predpredaj.zoznam.sk/sk/listky/fc-petrzalka-permanentka-202627/', now(), 'spectator', ARRAY[]::text[], false
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'TENNIS', 'TENNIS'::"SportType", 'DAVIS CUP: Slovensko - Grécko', 'DAVIS CUP: Slovensko - Grécko. Vstupenky pre divákov — 19.09.2026 od 12:00 - 20.09.2026 od 10:00. Miesto: NTC Košice, Popradská 84/E, 040 11 Košice - mestská časť Západ. Zdroj: predpredaj.zoznam.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Predpredaj.sk). https://predpredaj.zoznam.sk/sk/listky/davis-cup-slovensko-grecko-2026/',
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Košice', '2026-09-19T18:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'predpredaj', 'sk-listky-davis-cup-slovensko-grecko-2026', 'https://predpredaj.zoznam.sk/sk/listky/davis-cup-slovensko-grecko-2026/', 'Predpredaj.sk', true,
  'https://predpredaj.zoznam.sk/sk/listky/davis-cup-slovensko-grecko-2026/', now(), 'spectator', ARRAY[]::text[], false
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FOOTBALL', 'FOOTBALL'::"SportType", 'Domáce zápasy FC Petržalka v sezóne 2026/27', 'Domáce zápasy FC Petržalka v sezóne 2026/27. Vstupenky pre divákov — Sezóna 2026/ 2027. Miesto: M. C. Sklodowskej 1, 851 04 Bratislava - Petržalka. Zdroj: predpredaj.zoznam.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Predpredaj.sk). https://predpredaj.zoznam.sk/sk/listky/domace-zapasy-fc-petrzalka-v-sezone-202627/',
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80', 'Bratislava', '2026-08-17T18:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'predpredaj', 'sk-listky-domace-zapasy-fc-petrzalka-v-sezone-202627', 'https://predpredaj.zoznam.sk/sk/listky/domace-zapasy-fc-petrzalka-v-sezone-202627/', 'Predpredaj.sk', true,
  'https://predpredaj.zoznam.sk/sk/listky/domace-zapasy-fc-petrzalka-v-sezone-202627/', now(), 'spectator', ARRAY[]::text[], false
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

INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'HOCKEY', 'OTHER'::"SportType", 'HC Prešov - Permanentka 26/27', 'HC Prešov - Permanentka 26/27. Vstupenky pre divákov — 2026/27. Miesto: Zimný štadión, Pod Kalváriou 48, 080 01 Prešov. Zdroj: predpredaj.zoznam.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Predpredaj.sk). https://predpredaj.zoznam.sk/sk/listky/hc-presov-permanentka-2627/',
  'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80', 'Prešov', '2026-08-17T18:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'predpredaj', 'sk-listky-hc-presov-permanentka-2627', 'https://predpredaj.zoznam.sk/sk/listky/hc-presov-permanentka-2627/', 'Predpredaj.sk', true,
  'https://predpredaj.zoznam.sk/sk/listky/hc-presov-permanentka-2627/', now(), 'spectator', ARRAY[]::text[], false
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