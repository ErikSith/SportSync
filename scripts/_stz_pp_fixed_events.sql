-- STZ + Predpredaj upsert

INSERT INTO venues (name, address, city, sports, latitude, longitude, website_url, verified)
SELECT 'TIPOS Aréna', 'Odbojárov 9, Bratislava', 'Bratislava', ARRAY['HOCKEY']::text[], 48.1628, 17.1395, 'https://www.hcslovan.sk/', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name = 'TIPOS Aréna' AND city = 'Bratislava');

INSERT INTO venues (name, address, city, sports, latitude, longitude, website_url, verified)
SELECT 'NTC Košice', 'Popradská 84/E, Košice', 'Košice', ARRAY['TENNIS']::text[], 48.7164, 21.2381, 'https://www.stz.sk/', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name = 'NTC Košice' AND city = 'Košice');

INSERT INTO venues (name, address, city, sports, latitude, longitude, website_url, verified)
SELECT 'Národné tenisové centrum Bratislava', 'Bratislava', 'Bratislava', ARRAY['TENNIS']::text[], 48.1486, 17.1077, 'https://www.stz.sk/', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name = 'Národné tenisové centrum Bratislava' AND city = 'Bratislava');

INSERT INTO venues (name, address, city, sports, latitude, longitude, website_url, verified)
SELECT 'STZ tenisove podujatie', 'Slovensko', 'Bratislava', ARRAY['TENNIS']::text[], 48.1486, 17.1077, 'https://www.stz.sk/', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name = 'STZ tenisove podujatie' AND city = 'Bratislava');

INSERT INTO venues (name, address, city, sports, latitude, longitude, website_url, verified)
SELECT 'Predpredaj Bratislava', 'Bratislava', 'Bratislava', ARRAY['FOOTBALL','HOCKEY','TENNIS']::text[], 48.1486, 17.1077, 'https://predpredaj.zoznam.sk/sk/kategoria/sport/', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name = 'Predpredaj Bratislava' AND city = 'Bratislava');

INSERT INTO venues (name, address, city, sports, latitude, longitude, website_url, verified)
SELECT 'Predpredaj Kosice', 'Kosice', 'Košice', ARRAY['FOOTBALL','HANDBALL']::text[], 48.7164, 21.2611, 'https://predpredaj.zoznam.sk/sk/kategoria/sport/', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name = 'Predpredaj Kosice' AND city = 'Košice');

INSERT INTO venues (name, address, city, sports, latitude, longitude, website_url, verified)
SELECT 'Predpredaj Trnava', 'City Arena Trnava', 'Trnava', ARRAY['FOOTBALL']::text[], 48.3733, 17.5858, 'https://predpredaj.zoznam.sk/sk/kategoria/sport/', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name = 'Predpredaj Trnava' AND city = 'Trnava');

INSERT INTO venues (name, address, city, sports, latitude, longitude, website_url, verified)
SELECT 'Predpredaj Presov', 'Presov', 'Prešov', ARRAY['FOOTBALL','HOCKEY']::text[], 48.9985, 21.2411, 'https://predpredaj.zoznam.sk/sk/kategoria/sport/', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name = 'Predpredaj Presov' AND city = 'Prešov');
-- events
DELETE FROM events WHERE source = 'stz' AND external_id = 'dc-tickets-davis-cup-dc-vstupenky-su-uz-v-predaji-99';
INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city,
  price, price_cents, currency, capacity, max_participants, registered_count,
  starts_at, event_date, start_time, latitude, longitude, venue_id,
  source, external_id, source_url, ticket_url, scraped_at, participation_mode,
  theme_config, ai_enriched, photos, sponsors_json
) VALUES (
  'official', 'open', 'TENNIS', 'TENNIS'::"SportType",
  'DC: Vstupenky sú už v predaji!', 'Davis Cup — vstupenky pre divákov. NTC Košice. Zdroj: stz.sk / predpredaj.', 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Košice',
  0, 0, 'EUR', NULL, NULL, 0,
  '2026-09-19T12:00:00.000Z'::timestamptz,
  '2026-09-19T12:00:00.000Z'::timestamptz,
  '2026-09-19T12:00:00.000Z'::timestamptz,
  48.7164, 21.2381,
  (SELECT id FROM venues WHERE name = 'NTC Košice' LIMIT 1),
  'stz', 'dc-tickets-davis-cup-dc-vstupenky-su-uz-v-predaji-99', 'https://www.stz.sk/davis-cup/dc-vstupenky-su-uz-v-predaji-99', 'https://predpredaj.zoznam.sk/sk/listky/davis-cup-slovensko-grecko-2026/', now(),
  'spectator', '{"accent":"#22c55e","accentSoft":"rgba(34,197,94,0.18)","gradient":"linear-gradient(135deg, #14532d 0%, #22c55e 100%)","label":"Tenis"}'::jsonb, false, '{}'::text[], '[]'::jsonb
);
DELETE FROM events WHERE source = 'predpredaj' AND external_id = 'sk-listky-noc-gladiatorov-xiii-2026-10-17';
INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city,
  price, price_cents, currency, capacity, max_participants, registered_count,
  starts_at, event_date, start_time, latitude, longitude, venue_id,
  source, external_id, source_url, ticket_url, scraped_at, participation_mode,
  theme_config, ai_enriched, photos, sponsors_json
) VALUES (
  'official', 'open', 'COMBAT', 'OTHER'::"SportType",
  'NOC GLADIÁTOROV XIII', 'NOC GLADIÁTOROV XIII. Vstupenky pre divákov — 17.10.2026 16:00. Miesto: Športová hala, A. H. Škultétyho 1293, 990 01 Veľký Krtíš. Zdroj: predpredaj.zoznam.sk', 'https://cdn-predpredaj.zoznam.sk/media/fe_images/54/1000x1000px_.jpg', 'Veľký Krtíš',
  0, 0, 'EUR', NULL, NULL, 0,
  '2026-10-17T16:00:00.000Z'::timestamptz,
  '2026-10-17T16:00:00.000Z'::timestamptz,
  '2026-10-17T16:00:00.000Z'::timestamptz,
  48.1486, 17.1077,
  (SELECT id FROM venues WHERE name = 'Predpredaj Bratislava' LIMIT 1),
  'predpredaj', 'sk-listky-noc-gladiatorov-xiii-2026-10-17', 'https://predpredaj.zoznam.sk/sk/listky/noc-gladiatorov-xiii-2026-10-17/', 'https://predpredaj.zoznam.sk/sk/listky/noc-gladiatorov-xiii-2026-10-17/', now(),
  'spectator', '{"accent":"#7c3aed","accentSoft":"rgba(124,58,237,0.18)","gradient":"linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)","label":"Šport"}'::jsonb, false, '{}'::text[], '[]'::jsonb
);
DELETE FROM events WHERE source = 'predpredaj' AND external_id = 'sk-presale-fc-spartak-trnava-permanentka-sezona-202627';
INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city,
  price, price_cents, currency, capacity, max_participants, registered_count,
  starts_at, event_date, start_time, latitude, longitude, venue_id,
  source, external_id, source_url, ticket_url, scraped_at, participation_mode,
  theme_config, ai_enriched, photos, sponsors_json
) VALUES (
  'official', 'open', 'FOOTBALL', 'FOOTBALL'::"SportType",
  'FC Spartak Trnava - Permanentka 2026/27', 'FC Spartak Trnava - Permanentka 2026/27. Vstupenky pre divákov — Sezóna 2026/27. Miesto: Štadión Antona Malatinského, City Arena Trnava. Zdroj: predpredaj.zoznam.sk', 'https://cdn-predpredaj.zoznam.sk/media/fe_images/34/FCST-Permice_kampan-predpredaj-350x350.jpg', 'Trnava',
  0, 0, 'EUR', NULL, NULL, 0,
  '2026-08-17T18:00:00.000Z'::timestamptz,
  '2026-08-17T18:00:00.000Z'::timestamptz,
  '2026-08-17T18:00:00.000Z'::timestamptz,
  48.3733, 17.5858,
  (SELECT id FROM venues WHERE name = 'Predpredaj Trnava' LIMIT 1),
  'predpredaj', 'sk-presale-fc-spartak-trnava-permanentka-sezona-202627', 'https://predpredaj.zoznam.sk/sk/presale/fc-spartak-trnava-permanentka-sezona-202627/', 'https://predpredaj.zoznam.sk/sk/presale/fc-spartak-trnava-permanentka-sezona-202627/', now(),
  'spectator', '{"accent":"#2563eb","accentSoft":"rgba(37,99,235,0.18)","gradient":"linear-gradient(135deg, #0c4a6e 0%, #2563eb 100%)","label":"Futbal"}'::jsonb, false, '{}'::text[], '[]'::jsonb
);
DELETE FROM events WHERE source = 'predpredaj' AND external_id = 'sk-listky-fight-night-challenge-12-2026-12-12';
INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city,
  price, price_cents, currency, capacity, max_participants, registered_count,
  starts_at, event_date, start_time, latitude, longitude, venue_id,
  source, external_id, source_url, ticket_url, scraped_at, participation_mode,
  theme_config, ai_enriched, photos, sponsors_json
) VALUES (
  'official', 'open', 'HOCKEY', 'OTHER'::"SportType",
  'Fight Night Challenge 12', 'Fight Night Challenge 12. Vstupenky pre divákov — 12.12.2026 18:00. Miesto: TIPOS Aréna - Zimný štadión Ondreja Nepelu, Odbojárov 9, 831 04 Bratislava. Zdroj: predpredaj.zoznam.sk', 'https://cdn-predpredaj.zoznam.sk/media/fe_images/28/FNC12_zoznam_350x350.png', 'Bratislava',
  0, 0, 'EUR', NULL, NULL, 0,
  '2026-12-12T18:00:00.000Z'::timestamptz,
  '2026-12-12T18:00:00.000Z'::timestamptz,
  '2026-12-12T18:00:00.000Z'::timestamptz,
  48.1628, 17.1395,
  (SELECT id FROM venues WHERE name = 'TIPOS Aréna' LIMIT 1),
  'predpredaj', 'sk-listky-fight-night-challenge-12-2026-12-12', 'https://predpredaj.zoznam.sk/sk/listky/fight-night-challenge-12-2026-12-12/', 'https://predpredaj.zoznam.sk/sk/listky/fight-night-challenge-12-2026-12-12/', now(),
  'spectator', '{"accent":"#7c3aed","accentSoft":"rgba(124,58,237,0.18)","gradient":"linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)","label":"Šport"}'::jsonb, false, '{}'::text[], '[]'::jsonb
);
DELETE FROM events WHERE source = 'predpredaj' AND external_id = 'sk-registracie-ked-chuti-pomahat';
INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city,
  price, price_cents, currency, capacity, max_participants, registered_count,
  starts_at, event_date, start_time, latitude, longitude, venue_id,
  source, external_id, source_url, ticket_url, scraped_at, participation_mode,
  theme_config, ai_enriched, photos, sponsors_json
) VALUES (
  'official', 'open', 'OTHER', 'OTHER'::"SportType",
  'Keď chutí pomáhať', 'Keď chutí pomáhať. Registrácia / účasť — 12.09.2026 09:00. Miesto: RIVER PARK, Dvořákovo nábrežie 4 - 10, 811 02 Bratislava. Zdroj: predpredaj.zoznam.sk', 'https://cdn-predpredaj.zoznam.sk/media/fe_images/51/t1.png', 'Bratislava',
  0, 0, 'EUR', NULL, NULL, 0,
  '2026-09-12T09:00:00.000Z'::timestamptz,
  '2026-09-12T09:00:00.000Z'::timestamptz,
  '2026-09-12T09:00:00.000Z'::timestamptz,
  48.1486, 17.1077,
  (SELECT id FROM venues WHERE name = 'Predpredaj Bratislava' LIMIT 1),
  'predpredaj', 'sk-registracie-ked-chuti-pomahat', 'https://predpredaj.zoznam.sk/sk/registracie/ked-chuti-pomahat/', 'https://predpredaj.zoznam.sk/sk/registracie/ked-chuti-pomahat/', now(),
  'participate', '{"accent":"#7c3aed","accentSoft":"rgba(124,58,237,0.18)","gradient":"linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)","label":"Šport"}'::jsonb, false, '{}'::text[], '[]'::jsonb
);
DELETE FROM events WHERE source = 'predpredaj' AND external_id = 'sk-listky-fc-kosice-permanentka-2627';
INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city,
  price, price_cents, currency, capacity, max_participants, registered_count,
  starts_at, event_date, start_time, latitude, longitude, venue_id,
  source, external_id, source_url, ticket_url, scraped_at, participation_mode,
  theme_config, ai_enriched, photos, sponsors_json
) VALUES (
  'official', 'open', 'FOOTBALL', 'FOOTBALL'::"SportType",
  'FC Košice - Permanentka 26/27', 'FC Košice - Permanentka 26/27. Vstupenky pre divákov — Sezóna 2026/27. Miesto: Košická Futbalová Aréna, Pri prachárni 13, 040 11 Košice. Zdroj: predpredaj.zoznam.sk', 'https://cdn-predpredaj.zoznam.sk/media/fe_images/30/1_FlqY3IY.png', 'Košice',
  0, 0, 'EUR', NULL, NULL, 0,
  '2026-08-17T18:00:00.000Z'::timestamptz,
  '2026-08-17T18:00:00.000Z'::timestamptz,
  '2026-08-17T18:00:00.000Z'::timestamptz,
  48.7164, 21.2611,
  (SELECT id FROM venues WHERE name = 'Predpredaj Kosice' LIMIT 1),
  'predpredaj', 'sk-listky-fc-kosice-permanentka-2627', 'https://predpredaj.zoznam.sk/sk/listky/fc-kosice-permanentka-2627/', 'https://predpredaj.zoznam.sk/sk/listky/fc-kosice-permanentka-2627/', now(),
  'spectator', '{"accent":"#2563eb","accentSoft":"rgba(37,99,235,0.18)","gradient":"linear-gradient(135deg, #0c4a6e 0%, #2563eb 100%)","label":"Futbal"}'::jsonb, false, '{}'::text[], '[]'::jsonb
);
DELETE FROM events WHERE source = 'predpredaj' AND external_id = 'sk-listky-krali-ulice-xi-2026-08-29';
INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city,
  price, price_cents, currency, capacity, max_participants, registered_count,
  starts_at, event_date, start_time, latitude, longitude, venue_id,
  source, external_id, source_url, ticket_url, scraped_at, participation_mode,
  theme_config, ai_enriched, photos, sponsors_json
) VALUES (
  'official', 'open', 'HANDBALL', 'OTHER'::"SportType",
  'Králi ulice XI', 'Králi ulice XI. Vstupenky pre divákov — 29.08.2026 19:00. Miesto: Hádzanárska hala S.Šipoša, Alejová 2, 04011 Košice. Zdroj: predpredaj.zoznam.sk', 'https://cdn-predpredaj.zoznam.sk/media/fe_images/39/KrC3A1li_Ulice_XI_350x350px.png', 'Košice',
  0, 0, 'EUR', NULL, NULL, 0,
  '2026-08-29T19:00:00.000Z'::timestamptz,
  '2026-08-29T19:00:00.000Z'::timestamptz,
  '2026-08-29T19:00:00.000Z'::timestamptz,
  48.7164, 21.2611,
  (SELECT id FROM venues WHERE name = 'Predpredaj Kosice' LIMIT 1),
  'predpredaj', 'sk-listky-krali-ulice-xi-2026-08-29', 'https://predpredaj.zoznam.sk/sk/listky/krali-ulice-xi-2026-08-29/', 'https://predpredaj.zoznam.sk/sk/listky/krali-ulice-xi-2026-08-29/', now(),
  'spectator', '{"accent":"#7c3aed","accentSoft":"rgba(124,58,237,0.18)","gradient":"linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)","label":"Šport"}'::jsonb, false, '{}'::text[], '[]'::jsonb
);
DELETE FROM events WHERE source = 'predpredaj' AND external_id = 'sk-listky-fc-tatran-presov-permanentka-202627';
INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city,
  price, price_cents, currency, capacity, max_participants, registered_count,
  starts_at, event_date, start_time, latitude, longitude, venue_id,
  source, external_id, source_url, ticket_url, scraped_at, participation_mode,
  theme_config, ai_enriched, photos, sponsors_json
) VALUES (
  'official', 'open', 'FOOTBALL', 'FOOTBALL'::"SportType",
  'FC Tatran Prešov - Permanentka 2026/27', 'FC Tatran Prešov - Permanentka 2026/27. Vstupenky pre divákov — Sezóna 2026/27. Miesto: FUTBAL TATRAN ARÉNA, Čapajevova 49, 080 01 Prešov. Zdroj: predpredaj.zoznam.sk', 'https://cdn-predpredaj.zoznam.sk/media/fe_images/41/fct_permica.png', 'Prešov',
  0, 0, 'EUR', NULL, NULL, 0,
  '2026-08-17T18:00:00.000Z'::timestamptz,
  '2026-08-17T18:00:00.000Z'::timestamptz,
  '2026-08-17T18:00:00.000Z'::timestamptz,
  48.9985, 21.2411,
  (SELECT id FROM venues WHERE name = 'Predpredaj Presov' LIMIT 1),
  'predpredaj', 'sk-listky-fc-tatran-presov-permanentka-202627', 'https://predpredaj.zoznam.sk/sk/listky/fc-tatran-presov-permanentka-202627/', 'https://predpredaj.zoznam.sk/sk/listky/fc-tatran-presov-permanentka-202627/', now(),
  'spectator', '{"accent":"#2563eb","accentSoft":"rgba(37,99,235,0.18)","gradient":"linear-gradient(135deg, #0c4a6e 0%, #2563eb 100%)","label":"Futbal"}'::jsonb, false, '{}'::text[], '[]'::jsonb
);
DELETE FROM events WHERE source = 'predpredaj' AND external_id = 'sk-listky-fc-tatran-presov-mfk-tatran-liptovsky-mikulas-2026-08-08';
INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city,
  price, price_cents, currency, capacity, max_participants, registered_count,
  starts_at, event_date, start_time, latitude, longitude, venue_id,
  source, external_id, source_url, ticket_url, scraped_at, participation_mode,
  theme_config, ai_enriched, photos, sponsors_json
) VALUES (
  'official', 'open', 'FOOTBALL', 'FOOTBALL'::"SportType",
  'FC TATRAN Prešov - MFK TATRAN Liptovský Mikuláš', 'FC TATRAN Prešov - MFK TATRAN Liptovský Mikuláš. Vstupenky pre divákov — 08.08.2026 16:00. Miesto: FUTBAL TATRAN ARÉNA, Čapajevova 49, 080 01 Prešov. Zdroj: predpredaj.zoznam.sk', 'https://cdn-predpredaj.zoznam.sk/media/fe_images/18/fct_copy-2.png', 'Prešov',
  0, 0, 'EUR', NULL, NULL, 0,
  '2026-08-08T16:00:00.000Z'::timestamptz,
  '2026-08-08T16:00:00.000Z'::timestamptz,
  '2026-08-08T16:00:00.000Z'::timestamptz,
  48.9985, 21.2411,
  (SELECT id FROM venues WHERE name = 'Predpredaj Presov' LIMIT 1),
  'predpredaj', 'sk-listky-fc-tatran-presov-mfk-tatran-liptovsky-mikulas-2026-08-08', 'https://predpredaj.zoznam.sk/sk/listky/fc-tatran-presov-mfk-tatran-liptovsky-mikulas-2026-08-08/', 'https://predpredaj.zoznam.sk/sk/listky/fc-tatran-presov-mfk-tatran-liptovsky-mikulas-2026-08-08/', now(),
  'spectator', '{"accent":"#2563eb","accentSoft":"rgba(37,99,235,0.18)","gradient":"linear-gradient(135deg, #0c4a6e 0%, #2563eb 100%)","label":"Futbal"}'::jsonb, false, '{}'::text[], '[]'::jsonb
);
DELETE FROM events WHERE source = 'predpredaj' AND external_id = 'sk-listky-fc-spartak-trnava-mfk-dukla-banska-bystrica-2026-08-08';
INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city,
  price, price_cents, currency, capacity, max_participants, registered_count,
  starts_at, event_date, start_time, latitude, longitude, venue_id,
  source, external_id, source_url, ticket_url, scraped_at, participation_mode,
  theme_config, ai_enriched, photos, sponsors_json
) VALUES (
  'official', 'open', 'FOOTBALL', 'FOOTBALL'::"SportType",
  'FC Spartak Trnava - MFK Dukla Banská Bystrica', 'FC Spartak Trnava - MFK Dukla Banská Bystrica. Vstupenky pre divákov — 08.08.2026 20:30. Miesto: Štadión Antona Malatinského, City Arena Trnava. Zdroj: predpredaj.zoznam.sk', 'https://cdn-predpredaj.zoznam.sk/media/fe_images/07/Predpredaj_1_kdBLfPs.png', 'Trnava',
  0, 0, 'EUR', NULL, NULL, 0,
  '2026-08-08T20:30:00.000Z'::timestamptz,
  '2026-08-08T20:30:00.000Z'::timestamptz,
  '2026-08-08T20:30:00.000Z'::timestamptz,
  48.3733, 17.5858,
  (SELECT id FROM venues WHERE name = 'Predpredaj Trnava' LIMIT 1),
  'predpredaj', 'sk-listky-fc-spartak-trnava-mfk-dukla-banska-bystrica-2026-08-08', 'https://predpredaj.zoznam.sk/sk/listky/fc-spartak-trnava-mfk-dukla-banska-bystrica-2026-08-08/', 'https://predpredaj.zoznam.sk/sk/listky/fc-spartak-trnava-mfk-dukla-banska-bystrica-2026-08-08/', now(),
  'spectator', '{"accent":"#2563eb","accentSoft":"rgba(37,99,235,0.18)","gradient":"linear-gradient(135deg, #0c4a6e 0%, #2563eb 100%)","label":"Futbal"}'::jsonb, false, '{}'::text[], '[]'::jsonb
);
DELETE FROM events WHERE source = 'predpredaj' AND external_id = 'sk-listky-fc-tatran-family-2026-2027';
INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city,
  price, price_cents, currency, capacity, max_participants, registered_count,
  starts_at, event_date, start_time, latitude, longitude, venue_id,
  source, external_id, source_url, ticket_url, scraped_at, participation_mode,
  theme_config, ai_enriched, photos, sponsors_json
) VALUES (
  'official', 'open', 'FOOTBALL', 'FOOTBALL'::"SportType",
  'FC TATRAN FAMILY', 'FC TATRAN FAMILY. Vstupenky pre divákov — Sezóna 2026/27. Miesto: FUTBAL TATRAN ARÉNA, Čapajevova 49, 080 01 Prešov. Zdroj: predpredaj.zoznam.sk', 'https://cdn-predpredaj.zoznam.sk/media/fe_images/33/tatran_family.png', 'Prešov',
  0, 0, 'EUR', NULL, NULL, 0,
  '2026-08-17T18:00:00.000Z'::timestamptz,
  '2026-08-17T18:00:00.000Z'::timestamptz,
  '2026-08-17T18:00:00.000Z'::timestamptz,
  48.9985, 21.2411,
  (SELECT id FROM venues WHERE name = 'Predpredaj Presov' LIMIT 1),
  'predpredaj', 'sk-listky-fc-tatran-family-2026-2027', 'https://predpredaj.zoznam.sk/sk/listky/fc-tatran-family-2026-2027/', 'https://predpredaj.zoznam.sk/sk/listky/fc-tatran-family-2026-2027/', now(),
  'spectator', '{"accent":"#2563eb","accentSoft":"rgba(37,99,235,0.18)","gradient":"linear-gradient(135deg, #0c4a6e 0%, #2563eb 100%)","label":"Futbal"}'::jsonb, false, '{}'::text[], '[]'::jsonb
);
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
