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
