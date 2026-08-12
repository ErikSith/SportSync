INSERT INTO tournaments (
  name, description, sport, format, status, entry_fee, max_participants, current_participants,
  cover_url, city, latitude, longitude, starts_at, registration_deadline,
  venue_id, source, external_id, source_url, ticket_url, scraped_at, updated_at
) VALUES
('Turnaj D kategorie - Začiatočníci', 'Padel Knock Out turnaj — Turnaj D kategorie - Začiatočníci. Kapacita 8/8, štartovné 50 €. Aurial Padel Bratislava (Bajkalská 7). Registrácia: aurialpadel.sk

Lokalita: Ružinov (Bratislava II).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Aurial Padel Club). https://aurialpadel.sk/tournament/turnaj-zaciatocnici-08082026', 'PADEL', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN', 50, 8, 8, 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1569, 17.1402, '2026-08-08T10:00:00.000Z'::timestamptz, '2026-08-08T10:00:00.000Z'::timestamptz, (SELECT id FROM venues WHERE name ILIKE 'Aurial Padel Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'aurial-padel', 'aurialpadel-sk-tournament-turnaj-zaciatocnici-08082026', 'https://aurialpadel.sk/tournament/turnaj-zaciatocnici-08082026', 'https://aurialpadel.sk/tournament/turnaj-zaciatocnici-08082026', now(), now()),
('Turnaj C kategorie - Mierne Pokročilí', 'Padel Knock Out turnaj — Turnaj C kategorie - Mierne Pokročilí. Kapacita 5/8, štartovné 50 €. Aurial Padel Bratislava (Bajkalská 7). Registrácia: aurialpadel.sk

Lokalita: Ružinov (Bratislava II).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Aurial Padel Club). https://aurialpadel.sk/tournament/turnaj-mierne-pokrocili-08082026', 'PADEL', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN', 50, 8, 5, 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1569, 17.1402, '2026-08-08T10:00:00.000Z'::timestamptz, '2026-08-08T10:00:00.000Z'::timestamptz, (SELECT id FROM venues WHERE name ILIKE 'Aurial Padel Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'aurial-padel', 'aurialpadel-sk-tournament-turnaj-mierne-pokrocili-08082026', 'https://aurialpadel.sk/tournament/turnaj-mierne-pokrocili-08082026', 'https://aurialpadel.sk/tournament/turnaj-mierne-pokrocili-08082026', now(), now()),
('Turnaj B kategorie - Pokročilí', 'Padel Knock Out turnaj — Turnaj B kategorie - Pokročilí. Kapacita 0/8, štartovné 50 €. Aurial Padel Bratislava (Bajkalská 7). Registrácia: aurialpadel.sk

Lokalita: Ružinov (Bratislava II).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Aurial Padel Club). https://aurialpadel.sk/tournament/turnaj-pokrocili-08082026', 'PADEL', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN', 50, 8, 0, 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1569, 17.1402, '2026-08-08T14:30:00.000Z'::timestamptz, '2026-08-08T14:30:00.000Z'::timestamptz, (SELECT id FROM venues WHERE name ILIKE 'Aurial Padel Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'aurial-padel', 'aurialpadel-sk-tournament-turnaj-pokrocili-08082026', 'https://aurialpadel.sk/tournament/turnaj-pokrocili-08082026', 'https://aurialpadel.sk/tournament/turnaj-pokrocili-08082026', now(), now()),
('Turnaj A kategorie - EXPERT', 'Padel Knock Out turnaj — Turnaj A kategorie - EXPERT. Kapacita 1/10, štartovné 0 €. Aurial Padel Bratislava (Bajkalská 7). Registrácia: aurialpadel.sk

Lokalita: Ružinov (Bratislava II).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Aurial Padel Club). https://aurialpadel.sk/tournament/turnaj-expert-08082026', 'PADEL', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN', 0, 10, 1, 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1569, 17.1402, '2026-08-08T15:00:00.000Z'::timestamptz, '2026-08-08T15:00:00.000Z'::timestamptz, (SELECT id FROM venues WHERE name ILIKE 'Aurial Padel Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'aurial-padel', 'aurialpadel-sk-tournament-turnaj-expert-08082026', 'https://aurialpadel.sk/tournament/turnaj-expert-08082026', 'https://aurialpadel.sk/tournament/turnaj-expert-08082026', now(), now()),
('Turnaj D kategorie - Začiatočníci', 'Padel Knock Out turnaj — Turnaj D kategorie - Začiatočníci. Kapacita 8/8, štartovné 50 €. Aurial Padel Bratislava (Bajkalská 7). Registrácia: aurialpadel.sk

Lokalita: Ružinov (Bratislava II).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Aurial Padel Club). https://aurialpadel.sk/tournament/turnaj-zaciatocnici-09082026', 'PADEL', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN', 50, 8, 8, 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1569, 17.1402, '2026-08-09T10:00:00.000Z'::timestamptz, '2026-08-09T10:00:00.000Z'::timestamptz, (SELECT id FROM venues WHERE name ILIKE 'Aurial Padel Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'aurial-padel', 'aurialpadel-sk-tournament-turnaj-zaciatocnici-09082026', 'https://aurialpadel.sk/tournament/turnaj-zaciatocnici-09082026', 'https://aurialpadel.sk/tournament/turnaj-zaciatocnici-09082026', now(), now()),
('Turnaj C kategorie - Mierne Pokročilí', 'Padel Knock Out turnaj — Turnaj C kategorie - Mierne Pokročilí. Kapacita 3/8, štartovné 50 €. Aurial Padel Bratislava (Bajkalská 7). Registrácia: aurialpadel.sk

Lokalita: Ružinov (Bratislava II).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Aurial Padel Club). https://aurialpadel.sk/tournament/turnaj-mierne-pokrocili-09082026', 'PADEL', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN', 50, 8, 3, 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1569, 17.1402, '2026-08-09T10:00:00.000Z'::timestamptz, '2026-08-09T10:00:00.000Z'::timestamptz, (SELECT id FROM venues WHERE name ILIKE 'Aurial Padel Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'aurial-padel', 'aurialpadel-sk-tournament-turnaj-mierne-pokrocili-09082026', 'https://aurialpadel.sk/tournament/turnaj-mierne-pokrocili-09082026', 'https://aurialpadel.sk/tournament/turnaj-mierne-pokrocili-09082026', now(), now()),
('Turnaj B kategorie - Pokročilí', 'Padel Knock Out turnaj — Turnaj B kategorie - Pokročilí. Kapacita 5/8, štartovné 50 €. Aurial Padel Bratislava (Bajkalská 7). Registrácia: aurialpadel.sk

Lokalita: Ružinov (Bratislava II).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Aurial Padel Club). https://aurialpadel.sk/tournament/turnaj-pokrocili-09082026', 'PADEL', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN', 50, 8, 5, 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1569, 17.1402, '2026-08-09T14:30:00.000Z'::timestamptz, '2026-08-09T14:30:00.000Z'::timestamptz, (SELECT id FROM venues WHERE name ILIKE 'Aurial Padel Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'aurial-padel', 'aurialpadel-sk-tournament-turnaj-pokrocili-09082026', 'https://aurialpadel.sk/tournament/turnaj-pokrocili-09082026', 'https://aurialpadel.sk/tournament/turnaj-pokrocili-09082026', now(), now()),
('Turnaj Ženy - Zaciatocnicky & Mierne Pokrocile', 'Padel Knock Out turnaj — Turnaj Ženy - Zaciatocnicky & Mierne Pokrocile. Kapacita 0/8, štartovné 50 €. Aurial Padel Bratislava (Bajkalská 7). Registrácia: aurialpadel.sk

Lokalita: Ružinov (Bratislava II).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Aurial Padel Club). https://aurialpadel.sk/tournament/turnaj-zeny-zac-mier-pokrocile-09082026', 'PADEL', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN', 50, 8, 0, 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1569, 17.1402, '2026-08-09T15:00:00.000Z'::timestamptz, '2026-08-09T15:00:00.000Z'::timestamptz, (SELECT id FROM venues WHERE name ILIKE 'Aurial Padel Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'aurial-padel', 'aurialpadel-sk-tournament-turnaj-zeny-zac-mier-pokrocile-09082026', 'https://aurialpadel.sk/tournament/turnaj-zeny-zac-mier-pokrocile-09082026', 'https://aurialpadel.sk/tournament/turnaj-zeny-zac-mier-pokrocile-09082026', now(), now()),
('Turnaj Ženy - Pokročilé (v Rači)', 'Padel Knock Out turnaj — Turnaj Ženy - Pokročilé (v Rači). Kapacita 0/8, štartovné 50 €. Aurial Padel Rača. Registrácia: aurialpadel.sk

Lokalita: Rača (Bratislava III).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Aurial Padel Club). https://aurialpadel.sk/tournament/turnaj-zeny-pokrocile-30082026', 'PADEL', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN', 50, 8, 0, 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.2045, 17.1508, '2026-08-30T08:00:00.000Z'::timestamptz, '2026-08-30T08:00:00.000Z'::timestamptz, (SELECT id FROM venues WHERE name ILIKE 'Aurial Padel Rača' ORDER BY created_at NULLS LAST LIMIT 1), 'aurial-padel', 'aurialpadel-sk-tournament-turnaj-zeny-pokrocile-30082026', 'https://aurialpadel.sk/tournament/turnaj-zeny-pokrocile-30082026', 'https://aurialpadel.sk/tournament/turnaj-zeny-pokrocile-30082026', now(), now()),
('Turnaj Ženy - Pokročilé (v Rači)', 'Padel Knock Out turnaj — Turnaj Ženy - Pokročilé (v Rači). Kapacita 0/8, štartovné 50 €. Aurial Padel Rača. Registrácia: aurialpadel.sk

Lokalita: Rača (Bratislava III).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Aurial Padel Club). https://aurialpadel.sk/tournament/turnaj-zeny-pokrocile-10102026', 'PADEL', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN', 50, 8, 0, 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.2045, 17.1508, '2026-10-10T12:00:00.000Z'::timestamptz, '2026-10-10T12:00:00.000Z'::timestamptz, (SELECT id FROM venues WHERE name ILIKE 'Aurial Padel Rača' ORDER BY created_at NULLS LAST LIMIT 1), 'aurial-padel', 'aurialpadel-sk-tournament-turnaj-zeny-pokrocile-10102026', 'https://aurialpadel.sk/tournament/turnaj-zeny-pokrocile-10102026', 'https://aurialpadel.sk/tournament/turnaj-zeny-pokrocile-10102026', now(), now()),
('M SR družstiev MLÁDEŽE 2026', 'M SR družstiev MLÁDEŽE 2026. Turnaj / súťaž — možné sa zúčastniť (prihláška cez eTenis / ITF / TE). Nominované družstvá musia nanovo spracovať súpisky cez systém eTenis najneskôr do 6. 8. 2026. Názov súťaže zadajte M SR (viac info o spracovaní súpisky). Zdroj: stz.sk

Lokalita: Nové Mesto (Bratislava III).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (STZ – oficiálny web). https://www.stz.sk/druzstva/m-sr-druzstiev-mladeze-2026', 'TENNIS', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN', 0, 8, 0, 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1655, 17.1368, '2026-08-06T10:00:00.000Z'::timestamptz, '2026-08-06T10:00:00.000Z'::timestamptz, (SELECT id FROM venues WHERE name ILIKE 'Národné tenisové centrum Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'stz', 'druzstva-m-sr-druzstiev-mladeze-2026', 'https://www.stz.sk/druzstva/m-sr-druzstiev-mladeze-2026', 'https://www.stz.sk/druzstva/m-sr-druzstiev-mladeze-2026', now(), now()),
('M SR družstiev SENIOROV 2026', 'M SR družstiev SENIOROV 2026. Turnaj / súťaž — možné sa zúčastniť (prihláška cez eTenis / ITF / TE). Prihlásené družstvá musia spracovať súpisku cez systém eTenis najneskôr do 2. 9. 2026. Zdroj: stz.sk

Lokalita: Nové Mesto (Bratislava III).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (STZ – oficiálny web). https://www.stz.sk/seniorsky-tenis/m-sr-druzstiev-seniorov-2026', 'TENNIS', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN', 0, 8, 0, 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1655, 17.1368, '2026-09-02T10:00:00.000Z'::timestamptz, '2026-09-02T10:00:00.000Z'::timestamptz, (SELECT id FROM venues WHERE name ILIKE 'Národné tenisové centrum Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'stz', 'seniorsky-tenis-m-sr-druzstiev-seniorov-2026', 'https://www.stz.sk/seniorsky-tenis/m-sr-druzstiev-seniorov-2026', 'https://www.stz.sk/seniorsky-tenis/m-sr-druzstiev-seniorov-2026', now(), now()),
('Detský Davis Cup a Fed Cup s Nadáciou SPP 2026', 'Detský Davis Cup a Fed Cup s Nadáciou SPP 2026. Turnaj / súťaž — možné sa zúčastniť (prihláška cez eTenis / ITF / TE). Súťaž do 8 rokov: prihlásené družstvá musia spracovať súpisky cez systém eTenis najneskôr do 20. 8. 2026. Súťaž do 10 rokov: postupujúce družstvá do regionálneho kola musia spracovať súpisku prostredníctvom systému eTenis najneskôr do 20. 8. 2026. Zdroj: stz.sk

Lokalita: Nové Mesto (Bratislava III).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (STZ – oficiálny web). https://www.stz.sk/tenis-deti/detsky-davis-cup-a-fed-cup-s-nadaciou-spp-20', 'TENNIS', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN', 0, 8, 0, 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1655, 17.1368, '2026-08-20T10:00:00.000Z'::timestamptz, '2026-08-20T10:00:00.000Z'::timestamptz, (SELECT id FROM venues WHERE name ILIKE 'Národné tenisové centrum Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'stz', 'tenis-deti-detsky-davis-cup-a-fed-cup-s-nadaciou-spp-2026', 'https://www.stz.sk/tenis-deti/detsky-davis-cup-a-fed-cup-s-nadaciou-spp-2026', 'https://www.stz.sk/tenis-deti/detsky-davis-cup-a-fed-cup-s-nadaciou-spp-2026', now(), now()),
('Medzinárodný turnaj TEJT 2 do 14 rokov v Humennom', 'Medzinárodný turnaj TEJT 2 do 14 rokov v Humennom. Turnaj / súťaž — možné sa zúčastniť (prihláška cez eTenis / ITF / TE). V týždni od 8. septembra 2026 sa na dvorcoch 1. TC Humenné uskutoční medzinárodný turnaj kategórie TEJT 2 chlapcov a dievčat do 14 rokov. Uzávierka prihlášok na turnaj je 11. augusta. Viac informácií o turnaji nájdete na stránke www.tenniseurope.org. Zdroj: stz.sk

Lokalita: Nové Mesto (Bratislava III).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (STZ – oficiálny web). https://www.stz.sk/tenis-doma/medzinarodny-turnaj-tejt-2-do-14-rokov', 'TENNIS', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN', 0, 8, 0, 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Humenné', 48.1655, 17.1368, '2026-09-08T10:00:00.000Z'::timestamptz, '2026-09-08T10:00:00.000Z'::timestamptz, (SELECT id FROM venues WHERE name ILIKE 'Národné tenisové centrum Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'stz', 'tenis-doma-medzinarodny-turnaj-tejt-2-do-14-rokov-v-humennom-23', 'https://www.stz.sk/tenis-doma/medzinarodny-turnaj-tejt-2-do-14-rokov-v-humennom-23', 'https://www.stz.sk/tenis-doma/medzinarodny-turnaj-tejt-2-do-14-rokov-v-humennom-23', now(), now()),
('Medzinárodné juniorské turnaje ITF J30 v Humennom', 'Medzinárodné juniorské turnaje ITF J30 v Humennom. Turnaj / súťaž — možné sa zúčastniť (prihláška cez eTenis / ITF / TE). V týždni od 24. augusta 2026 sa na dvorcoch TK Humenné odohrá medzinárodný juniorský turnaj kategórie ITF J30 chlapcov a dievčat do 18 rokov. Uzávierka prihlášok na podujatie je 4. augusta. Hneď po ňom bude nasledovať ďalší turnaj rovnakej kategórie, na ktorý sa dá prihlásiť do 1 Zdroj: stz.sk

Lokalita: Nové Mesto (Bratislava III).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (STZ – oficiálny web). https://www.stz.sk/tenis-doma/medzinar', 'TENNIS', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN', 0, 8, 0, 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Humenné', 48.1655, 17.1368, '2026-08-24T10:00:00.000Z'::timestamptz, '2026-08-24T10:00:00.000Z'::timestamptz, (SELECT id FROM venues WHERE name ILIKE 'Národné tenisové centrum Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'stz', 'tenis-doma-medzinarodne-juniorske-turnaje-itf-j30-v-humennom-37', 'https://www.stz.sk/tenis-doma/medzinarodne-juniorske-turnaje-itf-j30-v-humennom-37', 'https://www.stz.sk/tenis-doma/medzinarodne-juniorske-turnaje-itf-j30-v-humennom-37', now(), now()),
('HORKÝŽE SLÍŽE - ČAROVNÉ TOUR 2026 27.11.2026', 'HORKÝŽE SLÍŽE - ČAROVNÉ TOUR 2026 27.11.2026

Lokalita: Nové Mesto (Bratislava III).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (NTC Bratislava). https://www.ntc.sk/podujatie/horkyze-slize-carovne-tour-2026.html', 'TENNIS', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN', 0, 8, 0, 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1655, 17.1368, '2026-11-27T17:00:00.000Z'::timestamptz, '2026-11-27T17:00:00.000Z'::timestamptz, (SELECT id FROM venues WHERE name ILIKE 'Národné tenisové centrum Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'ntc-ba', 'ntc-ba-https-www-ntc-sk-podujatie-horkyze-slize-carovne-tour-2026-html-2026-11-2', 'https://www.ntc.sk/podujatie/horkyze-slize-carovne-tour-2026.html', 'https://www.ntc.sk/podujatie/horkyze-slize-carovne-tour-2026.html', now(), now()),
('SARAH BRIGHTMAN 28.11.2026', 'SARAH BRIGHTMAN 28.11.2026

Lokalita: Nové Mesto (Bratislava III).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (NTC Bratislava). https://www.ntc.sk/podujatie/sarah-brightman.html', 'TENNIS', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN', 0, 8, 0, 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1655, 17.1368, '2026-11-28T17:00:00.000Z'::timestamptz, '2026-11-28T17:00:00.000Z'::timestamptz, (SELECT id FROM venues WHERE name ILIKE 'Národné tenisové centrum Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'ntc-ba', 'ntc-ba-https-www-ntc-sk-podujatie-sarah-brightman-html-2026-11-28', 'https://www.ntc.sk/podujatie/sarah-brightman.html', 'https://www.ntc.sk/podujatie/sarah-brightman.html', now(), now()),
('K-POP Fever 01.12.2026', 'K-POP Fever 01.12.2026

Lokalita: Nové Mesto (Bratislava III).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (NTC Bratislava). https://www.ntc.sk/podujatie/k-pop-fever.html', 'TENNIS', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN', 0, 8, 0, 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1655, 17.1368, '2026-12-01T17:00:00.000Z'::timestamptz, '2026-12-01T17:00:00.000Z'::timestamptz, (SELECT id FROM venues WHERE name ILIKE 'Národné tenisové centrum Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'ntc-ba', 'ntc-ba-https-www-ntc-sk-podujatie-k-pop-fever-html-2026-12-01', 'https://www.ntc.sk/podujatie/k-pop-fever.html', 'https://www.ntc.sk/podujatie/k-pop-fever.html', now(), now()),
('AL BANO & BAND - ALL THE GREATEST HITS 04.12.2026', 'AL BANO & BAND - ALL THE GREATEST HITS 04.12.2026

Lokalita: Nové Mesto (Bratislava III).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (NTC Bratislava). https://www.ntc.sk/podujatie/al-bano-band-all-the-greatest-hits-live.html', 'TENNIS', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN', 0, 8, 0, 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1655, 17.1368, '2026-12-04T17:00:00.000Z'::timestamptz, '2026-12-04T17:00:00.000Z'::timestamptz, (SELECT id FROM venues WHERE name ILIKE 'Národné tenisové centrum Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'ntc-ba', 'ntc-ba-https-www-ntc-sk-podujatie-al-bano-band-all-the-greatest-hits-live-html-2', 'https://www.ntc.sk/podujatie/al-bano-band-all-the-greatest-hits-live.html', 'https://www.ntc.sk/podujatie/al-bano-band-all-the-greatest-hits-live.html', now(), now()),
('19 09 BEH DUBNÍKOM Vodná nádrž Dubník I., Stará Turá - Vodná nádrž Dubník I., Stará Turá Dátum 19. september 2026', '19 09 BEH DUBNÍKOM Vodná nádrž Dubník I., Stará Turá - Vodná nádrž Dubník I., Stará Turá Dátum 19. september 2026 17 10 Beh od hradu k hradu Beckov (36km), Selec (26km), Soblahov (10km), spoločný cieľ Lesopark Brezina v blízkosti Trenčianského hradu - Trenčín, Brezina Dátum 17. október 2026

Lokalita: Lamač (Bratislava IV).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Horský Beh Karpaty). https://www.horskybeh.sk/terminovka/beh-dubnikom/2026-09-19-13-59', 'RUNNING', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN', 0, 8, 0, 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80', 'Bratislava', 48.2, 17.05, '2026-09-19T17:00:00.000Z'::timestamptz, '2026-09-19T17:00:00.000Z'::timestamptz, (SELECT id FROM venues WHERE name ILIKE 'Horský Beh Karpaty' ORDER BY created_at NULLS LAST LIMIT 1), 'horsky-beh', 'horsky-beh-https-www-horskybeh-sk-terminovka-beh-dubnikom-2026-09-19-13-59-2026-', 'https://www.horskybeh.sk/terminovka/beh-dubnikom/2026-09-19-13-59', 'https://www.horskybeh.sk/terminovka/beh-dubnikom/2026-09-19-13-59', now(), now()),
('19 09 BEH DUBNÍKOM Vodná nádrž Dubník I., Stará Turá - Vodná nádrž Dubník I., St', '19 09 BEH DUBNÍKOM Vodná nádrž Dubník I., Stará Turá - Vodná nádrž Dubník I., Stará Turá Dátum 19. september 2026

Lokalita: Lamač (Bratislava IV).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Horský Beh Karpaty). https://www.horskybeh.sk/', 'RUNNING', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN', 0, 8, 0, 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80', 'Bratislava', 48.2, 17.05, '2026-09-19T17:00:00.000Z'::timestamptz, '2026-09-19T17:00:00.000Z'::timestamptz, (SELECT id FROM venues WHERE name ILIKE 'Horský Beh Karpaty' ORDER BY created_at NULLS LAST LIMIT 1), 'horsky-beh', 'horsky-beh-https-www-horskybeh-sk-2026-09-19-19-09-beh-dubnikom-vodna-nadrz-dubn', 'https://www.horskybeh.sk/', 'https://www.horskybeh.sk/', now(), now()),
('17 10 Beh od hradu k hradu Beckov (36km), Selec (26km), Soblahov (10km), spoločný cieľ Lesopark Brezina v blízkosti Tren', '17 10 Beh od hradu k hradu Beckov (36km), Selec (26km), Soblahov (10km), spoločný cieľ Lesopark Brezina v blízkosti Trenčianského hradu - Trenčín, Brezina Dátum 17. október 2026

Lokalita: Lamač (Bratislava IV).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Horský Beh Karpaty). https://www.horskybeh.sk/terminovka/beh-od-hradu-k-hradu/2026-10-17-13-17', 'RUNNING', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN', 0, 8, 0, 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80', 'Bratislava', 48.2, 17.05, '2026-10-17T17:00:00.000Z'::timestamptz, '2026-10-17T17:00:00.000Z'::timestamptz, (SELECT id FROM venues WHERE name ILIKE 'Horský Beh Karpaty' ORDER BY created_at NULLS LAST LIMIT 1), 'horsky-beh', 'horsky-beh-https-www-horskybeh-sk-terminovka-beh-od-hradu-k-hradu-2026-10-17-13-', 'https://www.horskybeh.sk/terminovka/beh-od-hradu-k-hradu/2026-10-17-13-17', 'https://www.horskybeh.sk/terminovka/beh-od-hradu-k-hradu/2026-10-17-13-17', now(), now()),
('17 10 Beh od hradu k hradu Beckov (36km), Selec (26km), Soblahov (10km), spoločn', '17 10 Beh od hradu k hradu Beckov (36km), Selec (26km), Soblahov (10km), spoločný cieľ Lesopark Brezina v blízkosti Trenčianského hradu - Trenčín, Brezina Dátum 17. október 2026

Lokalita: Lamač (Bratislava IV).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Horský Beh Karpaty). https://www.horskybeh.sk/', 'RUNNING', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN', 0, 8, 0, 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80', 'Bratislava', 48.2, 17.05, '2026-10-17T17:00:00.000Z'::timestamptz, '2026-10-17T17:00:00.000Z'::timestamptz, (SELECT id FROM venues WHERE name ILIKE 'Horský Beh Karpaty' ORDER BY created_at NULLS LAST LIMIT 1), 'horsky-beh', 'horsky-beh-https-www-horskybeh-sk-2026-10-17-17-10-beh-od-hradu-k-hradu-beckov-3', 'https://www.horskybeh.sk/', 'https://www.horskybeh.sk/', now(), now()),
('2020-12-31 Finálne výsledky Karpatský pohár v horskom behu 2020', '2020-12-31 Finálne výsledky Karpatský pohár v horskom behu 2020 Read More

Lokalita: Lamač (Bratislava IV).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Horský Beh Karpaty). https://www.horskybeh.sk/kphb-2020', 'RUNNING', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN', 0, 8, 0, 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80', 'Bratislava', 48.2, 17.05, '2031-12-20T17:00:00.000Z'::timestamptz, '2031-12-20T17:00:00.000Z'::timestamptz, (SELECT id FROM venues WHERE name ILIKE 'Horský Beh Karpaty' ORDER BY created_at NULLS LAST LIMIT 1), 'horsky-beh', 'horsky-beh-https-www-horskybeh-sk-kphb-2020-2031-12-20-2020-12-31-finalne-vysled', 'https://www.horskybeh.sk/kphb-2020', 'https://www.horskybeh.sk/kphb-2020', now(), now()),
('2019-12-31 Silvestrovský kros', '2019-12-31 Silvestrovský kros Read More

Lokalita: Lamač (Bratislava IV).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Horský Beh Karpaty). http://vysledky.vysledkovyservis.sk/results.aspx?CId=16625&RId=324', 'RUNNING', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN', 0, 8, 0, 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80', 'Bratislava', 48.2, 17.05, '2031-12-19T17:00:00.000Z'::timestamptz, '2031-12-19T17:00:00.000Z'::timestamptz, (SELECT id FROM venues WHERE name ILIKE 'Horský Beh Karpaty' ORDER BY created_at NULLS LAST LIMIT 1), 'horsky-beh', 'horsky-beh-http-vysledky-vysledkovyservis-sk-results-aspx-cid-16625-rid-324-2031', 'http://vysledky.vysledkovyservis.sk/results.aspx?CId=16625&RId=324', 'http://vysledky.vysledkovyservis.sk/results.aspx?CId=16625&RId=324', now(), now())
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
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  scraped_at = now(),
  updated_at = now(),
  venue_id = COALESCE(EXCLUDED.venue_id, tournaments.venue_id);