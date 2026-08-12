DELETE FROM tournaments WHERE source = 'stz' AND external_id = 'druzstva-m-sr-druzstiev-mladeze-2026';
INSERT INTO tournaments (
  organizer_id, venue_id, name, description, sport, format, status,
  entry_fee, max_participants, current_participants, cover_url, city,
  latitude, longitude, starts_at, ends_at, registration_deadline,
  source, external_id, source_url, ticket_url, scraped_at, updated_at
) VALUES (
  NULL,
  (SELECT id FROM venues WHERE name = 'STZ tenisove podujatie' LIMIT 1),
  'M SR družstiev MLÁDEŽE 2026', 'M SR družstiev MLÁDEŽE 2026. Turnaj / súťaž — možné sa zúčastniť (prihláška cez eTenis / ITF / TE). Nominované družstvá musia nanovo spracovať súpisky cez systém eTenis najneskôr do 6. 8. 2026. Názov súťaže zadajte M SR (viac info o spracovaní súpisky). Zdroj: stz.sk', 'TENNIS', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN',
  0, 32, 0, 'https://www.stz.sk/images/template/news-blank.jpg', 'Bratislava',
  48.1486, 17.1077,
  '2026-08-06T10:00:00.000Z'::timestamptz, NULL,
  '2026-08-06T10:00:00.000Z'::timestamptz,
  'stz', 'druzstva-m-sr-druzstiev-mladeze-2026', 'https://www.stz.sk/druzstva/m-sr-druzstiev-mladeze-2026', 'https://www.stz.sk/druzstva/m-sr-druzstiev-mladeze-2026', now(), now()
);
DELETE FROM tournaments WHERE source = 'stz' AND external_id = 'tenis-deti-detsky-davis-cup-a-fed-cup-s-nadaciou-spp-2026';
INSERT INTO tournaments (
  organizer_id, venue_id, name, description, sport, format, status,
  entry_fee, max_participants, current_participants, cover_url, city,
  latitude, longitude, starts_at, ends_at, registration_deadline,
  source, external_id, source_url, ticket_url, scraped_at, updated_at
) VALUES (
  NULL,
  (SELECT id FROM venues WHERE name = 'STZ tenisove podujatie' LIMIT 1),
  'Detský Davis Cup a Fed Cup s Nadáciou SPP 2026', 'Detský Davis Cup a Fed Cup s Nadáciou SPP 2026. Turnaj / súťaž — možné sa zúčastniť (prihláška cez eTenis / ITF / TE). Súťaž do 8 rokov: prihlásené družstvá musia spracovať súpisky cez systém eTenis najneskôr do 20. 8. 2026. Súťaž do 10 rokov: postupujúce družstvá do regionálneho kola musia spracovať súpisku prostredníctvom systému eTenis najneskôr do 20. 8. 2026. Zdroj: stz.sk', 'TENNIS', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN',
  0, 32, 0, 'https://www.stz.sk/data/foto/12826/-1m.jpg', 'Bratislava',
  48.1486, 17.1077,
  '2026-08-20T10:00:00.000Z'::timestamptz, NULL,
  '2026-08-20T10:00:00.000Z'::timestamptz,
  'stz', 'tenis-deti-detsky-davis-cup-a-fed-cup-s-nadaciou-spp-2026', 'https://www.stz.sk/tenis-deti/detsky-davis-cup-a-fed-cup-s-nadaciou-spp-2026', 'https://www.stz.sk/tenis-deti/detsky-davis-cup-a-fed-cup-s-nadaciou-spp-2026', now(), now()
);
DELETE FROM tournaments WHERE source = 'stz' AND external_id = 'seniorsky-tenis-m-sr-druzstiev-seniorov-2026';
INSERT INTO tournaments (
  organizer_id, venue_id, name, description, sport, format, status,
  entry_fee, max_participants, current_participants, cover_url, city,
  latitude, longitude, starts_at, ends_at, registration_deadline,
  source, external_id, source_url, ticket_url, scraped_at, updated_at
) VALUES (
  NULL,
  (SELECT id FROM venues WHERE name = 'STZ tenisove podujatie' LIMIT 1),
  'M SR družstiev SENIOROV 2026', 'M SR družstiev SENIOROV 2026. Turnaj / súťaž — možné sa zúčastniť (prihláška cez eTenis / ITF / TE). Prihlásené družstvá musia spracovať súpisku cez systém eTenis najneskôr do 2. 9. 2026. Zdroj: stz.sk', 'TENNIS', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN',
  0, 32, 0, 'https://www.stz.sk/images/template/news-blank.jpg', 'Bratislava',
  48.1486, 17.1077,
  '2026-09-02T10:00:00.000Z'::timestamptz, NULL,
  '2026-09-02T10:00:00.000Z'::timestamptz,
  'stz', 'seniorsky-tenis-m-sr-druzstiev-seniorov-2026', 'https://www.stz.sk/seniorsky-tenis/m-sr-druzstiev-seniorov-2026', 'https://www.stz.sk/seniorsky-tenis/m-sr-druzstiev-seniorov-2026', now(), now()
);
DELETE FROM tournaments WHERE source = 'stz' AND external_id = 'tenis-doma-medzinarodny-turnaj-tejt-2-do-14-rokov-v-humennom-23';
INSERT INTO tournaments (
  organizer_id, venue_id, name, description, sport, format, status,
  entry_fee, max_participants, current_participants, cover_url, city,
  latitude, longitude, starts_at, ends_at, registration_deadline,
  source, external_id, source_url, ticket_url, scraped_at, updated_at
) VALUES (
  NULL,
  (SELECT id FROM venues WHERE name = 'STZ tenisove podujatie' LIMIT 1),
  'Medzinárodný turnaj TEJT 2 do 14 rokov v Humennom', 'Medzinárodný turnaj TEJT 2 do 14 rokov v Humennom. Turnaj / súťaž — možné sa zúčastniť (prihláška cez eTenis / ITF / TE). V týždni od 8. septembra 2026 sa na dvorcoch 1. TC Humenné uskutoční medzinárodný turnaj kategórie TEJT 2 chlapcov a dievčat do 14 rokov. Uzávierka prihlášok na turnaj je 11. augusta. Viac informácií o turnaji nájdete na stránke www.tenniseurope.org. Zdroj: stz.sk', 'TENNIS', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN',
  0, 32, 0, 'https://www.stz.sk/data/foto/14422/-1m.jpg', 'Humenné',
  48.1486, 17.1077,
  '2026-09-08T10:00:00.000Z'::timestamptz, NULL,
  '2026-09-08T10:00:00.000Z'::timestamptz,
  'stz', 'tenis-doma-medzinarodny-turnaj-tejt-2-do-14-rokov-v-humennom-23', 'https://www.stz.sk/tenis-doma/medzinarodny-turnaj-tejt-2-do-14-rokov-v-humennom-23', 'https://www.stz.sk/tenis-doma/medzinarodny-turnaj-tejt-2-do-14-rokov-v-humennom-23', now(), now()
);
DELETE FROM tournaments WHERE source = 'stz' AND external_id = 'tenis-doma-medzinarodne-juniorske-turnaje-itf-j30-v-humennom-37';
INSERT INTO tournaments (
  organizer_id, venue_id, name, description, sport, format, status,
  entry_fee, max_participants, current_participants, cover_url, city,
  latitude, longitude, starts_at, ends_at, registration_deadline,
  source, external_id, source_url, ticket_url, scraped_at, updated_at
) VALUES (
  NULL,
  (SELECT id FROM venues WHERE name = 'STZ tenisove podujatie' LIMIT 1),
  'Medzinárodné juniorské turnaje ITF J30 v Humennom', 'Medzinárodné juniorské turnaje ITF J30 v Humennom. Turnaj / súťaž — možné sa zúčastniť (prihláška cez eTenis / ITF / TE). V týždni od 24. augusta 2026 sa na dvorcoch TK Humenné odohrá medzinárodný juniorský turnaj kategórie ITF J30 chlapcov a dievčat do 18 rokov. Uzávierka prihlášok na podujatie je 4. augusta. Hneď po ňom bude nasledovať ďalší turnaj rovnakej kategórie, na ktorý sa dá prihlásiť do 1 Zdroj: stz.sk', 'TENNIS', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN',
  0, 32, 0, 'https://www.stz.sk/data/foto/14421/-1m.jpg', 'Humenné',
  48.1486, 17.1077,
  '2026-08-24T10:00:00.000Z'::timestamptz, NULL,
  '2026-08-24T10:00:00.000Z'::timestamptz,
  'stz', 'tenis-doma-medzinarodne-juniorske-turnaje-itf-j30-v-humennom-37', 'https://www.stz.sk/tenis-doma/medzinarodne-juniorske-turnaje-itf-j30-v-humennom-37', 'https://www.stz.sk/tenis-doma/medzinarodne-juniorske-turnaje-itf-j30-v-humennom-37', now(), now()
);
