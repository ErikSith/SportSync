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