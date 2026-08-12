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