DELETE FROM events WHERE source = 'predpredaj' AND external_id = 'sk-listky-fc-petrzalka-permanentka-202627';
INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city,
  price, price_cents, currency, capacity, max_participants, registered_count,
  starts_at, event_date, start_time, latitude, longitude, venue_id,
  source, external_id, source_url, ticket_url, scraped_at, participation_mode,
  theme_config, ai_enriched, photos, sponsors_json
) VALUES (
  'official', 'open', 'FOOTBALL', 'FOOTBALL'::"SportType",
  'FC Petržalka - Permanentka 2026/27', 'FC Petržalka - Permanentka 2026/27. Vstupenky pre divákov — Sezóna 2026/27. Miesto: M. C. Sklodowskej 1, 851 04 Bratislava - Petržalka. Zdroj: predpredaj.zoznam.sk', 'https://cdn-predpredaj.zoznam.sk/media/fe_images/28/Petrzalka_permanentka.jpg', 'Bratislava',
  0, 0, 'EUR', NULL, NULL, 0,
  '2026-08-17T18:00:00.000Z'::timestamptz,
  '2026-08-17T18:00:00.000Z'::timestamptz,
  '2026-08-17T18:00:00.000Z'::timestamptz,
  48.1486, 17.1077,
  (SELECT id FROM venues WHERE name = 'Predpredaj Bratislava' LIMIT 1),
  'predpredaj', 'sk-listky-fc-petrzalka-permanentka-202627', 'https://predpredaj.zoznam.sk/sk/listky/fc-petrzalka-permanentka-202627/', 'https://predpredaj.zoznam.sk/sk/listky/fc-petrzalka-permanentka-202627/', now(),
  'spectator', '{"accent":"#2563eb","accentSoft":"rgba(37,99,235,0.18)","gradient":"linear-gradient(135deg, #0c4a6e 0%, #2563eb 100%)","label":"Futbal"}'::jsonb, false, '{}'::text[], '[]'::jsonb
);
DELETE FROM events WHERE source = 'predpredaj' AND external_id = 'sk-listky-davis-cup-slovensko-grecko-2026';
INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city,
  price, price_cents, currency, capacity, max_participants, registered_count,
  starts_at, event_date, start_time, latitude, longitude, venue_id,
  source, external_id, source_url, ticket_url, scraped_at, participation_mode,
  theme_config, ai_enriched, photos, sponsors_json
) VALUES (
  'official', 'open', 'TENNIS', 'TENNIS'::"SportType",
  'DAVIS CUP: Slovensko - Grécko', 'DAVIS CUP: Slovensko - Grécko. Vstupenky pre divákov — 19.09.2026 od 12:00 - 20.09.2026 od 10:00. Miesto: NTC Košice, Popradská 84/E, 040 11 Košice - mestská časť Západ. Zdroj: predpredaj.zoznam.sk', 'https://cdn-predpredaj.zoznam.sk/media/fe_images/53/800x800F_GRE.jpg', 'Košice',
  0, 0, 'EUR', NULL, NULL, 0,
  '2026-09-19T18:00:00.000Z'::timestamptz,
  '2026-09-19T18:00:00.000Z'::timestamptz,
  '2026-09-19T18:00:00.000Z'::timestamptz,
  48.7164, 21.2381,
  (SELECT id FROM venues WHERE name = 'NTC Košice' LIMIT 1),
  'predpredaj', 'sk-listky-davis-cup-slovensko-grecko-2026', 'https://predpredaj.zoznam.sk/sk/listky/davis-cup-slovensko-grecko-2026/', 'https://predpredaj.zoznam.sk/sk/listky/davis-cup-slovensko-grecko-2026/', now(),
  'spectator', '{"accent":"#22c55e","accentSoft":"rgba(34,197,94,0.18)","gradient":"linear-gradient(135deg, #14532d 0%, #22c55e 100%)","label":"Tenis"}'::jsonb, false, '{}'::text[], '[]'::jsonb
);
DELETE FROM events WHERE source = 'predpredaj' AND external_id = 'sk-listky-domace-zapasy-fc-petrzalka-v-sezone-202627';
INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city,
  price, price_cents, currency, capacity, max_participants, registered_count,
  starts_at, event_date, start_time, latitude, longitude, venue_id,
  source, external_id, source_url, ticket_url, scraped_at, participation_mode,
  theme_config, ai_enriched, photos, sponsors_json
) VALUES (
  'official', 'open', 'FOOTBALL', 'FOOTBALL'::"SportType",
  'Domáce zápasy FC Petržalka v sezóne 2026/27', 'Domáce zápasy FC Petržalka v sezóne 2026/27. Vstupenky pre divákov — Sezóna 2026/ 2027. Miesto: M. C. Sklodowskej 1, 851 04 Bratislava - Petržalka. Zdroj: predpredaj.zoznam.sk', 'https://cdn-predpredaj.zoznam.sk/media/fe_images/43/fc-petrzalka.jpg', 'Bratislava',
  0, 0, 'EUR', NULL, NULL, 0,
  '2026-08-17T18:00:00.000Z'::timestamptz,
  '2026-08-17T18:00:00.000Z'::timestamptz,
  '2026-08-17T18:00:00.000Z'::timestamptz,
  48.1486, 17.1077,
  (SELECT id FROM venues WHERE name = 'Predpredaj Bratislava' LIMIT 1),
  'predpredaj', 'sk-listky-domace-zapasy-fc-petrzalka-v-sezone-202627', 'https://predpredaj.zoznam.sk/sk/listky/domace-zapasy-fc-petrzalka-v-sezone-202627/', 'https://predpredaj.zoznam.sk/sk/listky/domace-zapasy-fc-petrzalka-v-sezone-202627/', now(),
  'spectator', '{"accent":"#2563eb","accentSoft":"rgba(37,99,235,0.18)","gradient":"linear-gradient(135deg, #0c4a6e 0%, #2563eb 100%)","label":"Futbal"}'::jsonb, false, '{}'::text[], '[]'::jsonb
);
DELETE FROM events WHERE source = 'predpredaj' AND external_id = 'sk-listky-hc-presov-permanentka-2627';
INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city,
  price, price_cents, currency, capacity, max_participants, registered_count,
  starts_at, event_date, start_time, latitude, longitude, venue_id,
  source, external_id, source_url, ticket_url, scraped_at, participation_mode,
  theme_config, ai_enriched, photos, sponsors_json
) VALUES (
  'official', 'open', 'HOCKEY', 'OTHER'::"SportType",
  'HC Prešov - Permanentka 26/27', 'HC Prešov - Permanentka 26/27. Vstupenky pre divákov — 2026/27. Miesto: Zimný štadión, Pod Kalváriou 48, 080 01 Prešov. Zdroj: predpredaj.zoznam.sk', 'https://cdn-predpredaj.zoznam.sk/media/fe_images/25/logo22-png_1Ds3dsO.jpg', 'Prešov',
  0, 0, 'EUR', NULL, NULL, 0,
  '2026-08-17T18:00:00.000Z'::timestamptz,
  '2026-08-17T18:00:00.000Z'::timestamptz,
  '2026-08-17T18:00:00.000Z'::timestamptz,
  48.9985, 21.2411,
  (SELECT id FROM venues WHERE name = 'Predpredaj Presov' LIMIT 1),
  'predpredaj', 'sk-listky-hc-presov-permanentka-2627', 'https://predpredaj.zoznam.sk/sk/listky/hc-presov-permanentka-2627/', 'https://predpredaj.zoznam.sk/sk/listky/hc-presov-permanentka-2627/', now(),
  'spectator', '{"accent":"#7c3aed","accentSoft":"rgba(124,58,237,0.18)","gradient":"linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)","label":"Šport"}'::jsonb, false, '{}'::text[], '[]'::jsonb
);
-- tournaments
