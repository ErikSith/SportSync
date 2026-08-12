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