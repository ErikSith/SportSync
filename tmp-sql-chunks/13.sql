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