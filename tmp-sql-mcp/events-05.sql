INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  event_date, start_time, price, price_cents, capacity, max_participants, registered_count,
  latitude, longitude, venue_id, source, external_id, source_url, source_name, is_aggregated,
  ticket_url, scraped_at, participation_mode, photos, ai_enriched
) VALUES
('official','open','FITNESS','OTHER'::"SportType",'Eurovea privíta medzinárodný 3x3 basketbal','Eurovea privíta medzinárodný 3x3 basketbal.  7.8.2026 - 16.8.2026 / Eurovea. Otvorená športová aktivita — môžeš sa zúčastniť. Zdroj: citylife.sk

Lokalita: Staré Mesto (Bratislava I).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (CityLife). https://www.citylife.sk/ina-akcia/eurovea-privita-medzinarodny-3x3-basketbal','https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80','Bratislava','2026-08-07T07:30:00.000Z'::timestamptz,'2026-08-07T07:30:00.000Z'::timestamptz,'2026-08-07T07:30:00.000Z'::timestamptz,0,0,NULL,NULL,0,48.1405,17.1225,(SELECT id FROM venues WHERE name ILIKE 'Eurovea (Dunaj)' ORDER BY created_at NULLS LAST LIMIT 1),'citylife','ina-akcia-eurovea-privita-medzinarodny-3x3-basketbal','https://www.citylife.sk/ina-akcia/eurovea-privita-medzinarodny-3x3-basketbal','CityLife',true,'https://www.citylife.sk/ina-akcia/eurovea-privita-medzinarodny-3x3-basketbal',now(),'participate',ARRAY[]::text[],false),
('official','open','FITNESS','OTHER'::"SportType",'Ranné cvičenie s Gymstick','Ranné cvičenie s Gymstick.  7.8.2026 - 28.8.2026 / Eurovea. Otvorená športová aktivita — môžeš sa zúčastniť. Zdroj: citylife.sk

Lokalita: Staré Mesto (Bratislava I).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (CityLife). https://www.citylife.sk/ina-akcia/ranne-cvicenie-s-gymstick','https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80','Bratislava','2026-08-07T07:30:00.000Z'::timestamptz,'2026-08-07T07:30:00.000Z'::timestamptz,'2026-08-07T07:30:00.000Z'::timestamptz,0,0,NULL,NULL,0,48.1405,17.1225,(SELECT id FROM venues WHERE name ILIKE 'Eurovea (Dunaj)' ORDER BY created_at NULLS LAST LIMIT 1),'citylife','ina-akcia-ranne-cvicenie-s-gymstick','https://www.citylife.sk/ina-akcia/ranne-cvicenie-s-gymstick','CityLife',true,'https://www.citylife.sk/ina-akcia/ranne-cvicenie-s-gymstick',now(),'participate',ARRAY[]::text[],false),
('official','open','FITNESS','OTHER'::"SportType",'Slávnostné otvorenie Majstrovstiev Európy vo wakeboardingu a wakeskatingu','Slávnostné otvorenie Majstrovstiev Európy vo wakeboardingu a wakeskatingu.  Ut 25.8.2026 / Eurovea. Otvorená športová aktivita — môžeš sa zúčastniť. Zdroj: citylife.sk

Lokalita: Staré Mesto (Bratislava I).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (CityLife). https://www.citylife.sk/ina-akcia/slavnostne-otvorenie-majstrovstiev-europy-vo-wakeboardingu-a-wakeskatingu','https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80','Bratislava','2026-08-25T07:30:00.000Z'::timestamptz,'2026-08-25T07:30:00.000Z'::timestamptz,'2026-08-25T07:30:00.000Z'::timestamptz,0,0,NULL,NULL,0,48.1405,17.1225,(SELECT id FROM venues WHERE name ILIKE 'Eurovea (Dunaj)' ORDER BY created_at NULLS LAST LIMIT 1),'citylife','ina-akcia-slavnostne-otvorenie-majstrovstiev-europy-vo-wakeboardingu-a-wakeskati','https://www.citylife.sk/ina-akcia/slavnostne-otvorenie-majstrovstiev-europy-vo-wakeboardingu-a-wakeskatingu','CityLife',true,'https://www.citylife.sk/ina-akcia/slavnostne-otvorenie-majstrovstiev-europy-vo-wakeboardingu-a-wakeskatingu',now(),'participate',ARRAY[]::text[],false),
('official','open','FITNESS','OTHER'::"SportType",'Fitness & Fun','Fitness & Fun.  So 29.8.2026 / Eurovea. Otvorená športová aktivita — môžeš sa zúčastniť. Zdroj: citylife.sk

Lokalita: Staré Mesto (Bratislava I).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (CityLife). https://www.citylife.sk/ina-akcia/fitness-fun-eurovea','https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80','Bratislava','2026-08-29T07:30:00.000Z'::timestamptz,'2026-08-29T07:30:00.000Z'::timestamptz,'2026-08-29T07:30:00.000Z'::timestamptz,0,0,NULL,NULL,0,48.1405,17.1225,(SELECT id FROM venues WHERE name ILIKE 'Eurovea (Dunaj)' ORDER BY created_at NULLS LAST LIMIT 1),'citylife','ina-akcia-fitness-fun-eurovea','https://www.citylife.sk/ina-akcia/fitness-fun-eurovea','CityLife',true,'https://www.citylife.sk/ina-akcia/fitness-fun-eurovea',now(),'participate',ARRAY[]::text[],false),
('official','open','TENNIS','TENNIS'::"SportType",'Majstrovstvá Slovenska družstiev dorastencov','Majstrovstvá Slovenska družstiev dorastencov. Divácke podujatie — vstupenky. Majstrovstvá Slovenska družstiev dorastencov sa uskutočnia v termíne od 17. - 19. augusta 2026 na dvorcoch 1. TC Humenné. O titul bude bojovať osem tímov, viac informácií TU. Zdroj: stz.sk

Lokalita: Nové Mesto (Bratislava III).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (STZ – oficiálny web). https://www.stz.sk/tenis-doma/majstrovstva-slovenska-druzstiev-dorastencov-87','https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80','Humenné','2026-08-17T10:00:00.000Z'::timestamptz,'2026-08-17T10:00:00.000Z'::timestamptz,'2026-08-17T10:00:00.000Z'::timestamptz,0,0,NULL,NULL,0,48.1655,17.1368,(SELECT id FROM venues WHERE name ILIKE 'Národné tenisové centrum Bratislava' ORDER BY created_at NULLS LAST LIMIT 1),'stz','tenis-doma-majstrovstva-slovenska-druzstiev-dorastencov-87','https://www.stz.sk/tenis-doma/majstrovstva-slovenska-druzstiev-dorastencov-87','STZ – oficiálny web',true,'https://www.stz.sk/tenis-doma/majstrovstva-slovenska-druzstiev-dorastencov-87',now(),'spectator',ARRAY[]::text[],false),
('official','open','TENNIS','TENNIS'::"SportType",'DC: Vstupenky sú už v predaji!','Davis Cup — vstupenky pre divákov. NTC Košice. Zdroj: stz.sk / predpredaj.

Lokalita: Nové Mesto (Bratislava III).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (STZ – oficiálny web). https://www.stz.sk/davis-cup/dc-vstupenky-su-uz-v-predaji-99','https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80','Košice','2026-09-19T12:00:00.000Z'::timestamptz,'2026-09-19T12:00:00.000Z'::timestamptz,'2026-09-19T12:00:00.000Z'::timestamptz,0,0,NULL,NULL,0,48.7164,21.2381,(SELECT id FROM venues WHERE name ILIKE 'NTC Košice' ORDER BY created_at NULLS LAST LIMIT 1),'stz','dc-tickets-davis-cup-dc-vstupenky-su-uz-v-predaji-99','https://www.stz.sk/davis-cup/dc-vstupenky-su-uz-v-predaji-99','STZ – oficiálny web',true,'https://predpredaj.zoznam.sk/sk/listky/davis-cup-slovensko-grecko-2026/',now(),'spectator',ARRAY[]::text[],false),
('official','open','COMBAT','OTHER'::"SportType",'NOC GLADIÁTOROV XIII','NOC GLADIÁTOROV XIII. Vstupenky pre divákov — 17.10.2026 16:00. Miesto: Športová hala, A. H. Škultétyho 1293, 990 01 Veľký Krtíš. Zdroj: predpredaj.zoznam.sk

Lokalita: Nové Mesto (Bratislava III).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Predpredaj.sk). https://predpredaj.zoznam.sk/sk/listky/noc-gladiatorov-xiii-2026-10-17/','https://images.unsplash.com/photo-1549719386-90efe2c3b85e?w=800&q=80','Veľký Krtíš','2026-10-17T16:00:00.000Z'::timestamptz,'2026-10-17T16:00:00.000Z'::timestamptz,'2026-10-17T16:00:00.000Z'::timestamptz,0,0,NULL,NULL,0,48.1636,17.1386,(SELECT id FROM venues WHERE name ILIKE 'Tehelné pole' ORDER BY created_at NULLS LAST LIMIT 1),'predpredaj','sk-listky-noc-gladiatorov-xiii-2026-10-17','https://predpredaj.zoznam.sk/sk/listky/noc-gladiatorov-xiii-2026-10-17/','Predpredaj.sk',true,'https://predpredaj.zoznam.sk/sk/listky/noc-gladiatorov-xiii-2026-10-17/',now(),'spectator',ARRAY[]::text[],false),
('official','open','FOOTBALL','FOOTBALL'::"SportType",'FC Spartak Trnava - Permanentka 2026/27','FC Spartak Trnava - Permanentka 2026/27. Vstupenky pre divákov — Sezóna 2026/27. Miesto: Štadión Antona Malatinského, City Arena Trnava. Zdroj: predpredaj.zoznam.sk

Lokalita: Nové Mesto (Bratislava III).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Predpredaj.sk). https://predpredaj.zoznam.sk/sk/presale/fc-spartak-trnava-permanentka-sezona-202627/','https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80','Trnava','2026-08-18T18:00:00.000Z'::timestamptz,'2026-08-18T18:00:00.000Z'::timestamptz,'2026-08-18T18:00:00.000Z'::timestamptz,0,0,NULL,NULL,0,48.1636,17.1386,(SELECT id FROM venues WHERE name ILIKE 'Tehelné pole' ORDER BY created_at NULLS LAST LIMIT 1),'predpredaj','sk-presale-fc-spartak-trnava-permanentka-sezona-202627','https://predpredaj.zoznam.sk/sk/presale/fc-spartak-trnava-permanentka-sezona-202627/','Predpredaj.sk',true,'https://predpredaj.zoznam.sk/sk/presale/fc-spartak-trnava-permanentka-sezona-202627/',now(),'spectator',ARRAY[]::text[],false),
('official','open','HOCKEY','OTHER'::"SportType",'Fight Night Challenge 12','Fight Night Challenge 12. Vstupenky pre divákov — 12.12.2026 18:00. Miesto: TIPOS Aréna - Zimný štadión Ondreja Nepelu, Odbojárov 9, 831 04 Bratislava. Zdroj: predpredaj.zoznam.sk

Lokalita: Nové Mesto (Bratislava III).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Predpredaj.sk). https://predpredaj.zoznam.sk/sk/listky/fight-night-challenge-12-2026-12-12/','https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80','Bratislava','2026-12-12T18:00:00.000Z'::timestamptz,'2026-12-12T18:00:00.000Z'::timestamptz,'2026-12-12T18:00:00.000Z'::timestamptz,0,0,NULL,NULL,0,48.1628,17.1395,(SELECT id FROM venues WHERE name ILIKE 'TIPOS Aréna' ORDER BY created_at NULLS LAST LIMIT 1),'predpredaj','sk-listky-fight-night-challenge-12-2026-12-12','https://predpredaj.zoznam.sk/sk/listky/fight-night-challenge-12-2026-12-12/','Predpredaj.sk',true,'https://predpredaj.zoznam.sk/sk/listky/fight-night-challenge-12-2026-12-12/',now(),'spectator',ARRAY[]::text[],false),
('official','open','FOOTBALL','FOOTBALL'::"SportType",'DAC 1904 - FC Twente Enschede UECL','DAC 1904 - FC Twente Enschede UECL. Vstupenky pre divákov — 13.08.2026 19:00. Miesto: Športová ulica, 929 01 Dunajská Streda. Zdroj: predpredaj.zoznam.sk

Lokalita: Nové Mesto (Bratislava III).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Predpredaj.sk). https://predpredaj.zoznam.sk/sk/listky/dac-1904-fc-twente-enschede-uecl-2026-08-13/','https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80','Bratislava','2026-08-13T19:00:00.000Z'::timestamptz,'2026-08-13T19:00:00.000Z'::timestamptz,'2026-08-13T19:00:00.000Z'::timestamptz,0,0,NULL,NULL,0,48.1636,17.1386,(SELECT id FROM venues WHERE name ILIKE 'Tehelné pole' ORDER BY created_at NULLS LAST LIMIT 1),'predpredaj','sk-listky-dac-1904-fc-twente-enschede-uecl-2026-08-13','https://predpredaj.zoznam.sk/sk/listky/dac-1904-fc-twente-enschede-uecl-2026-08-13/','Predpredaj.sk',true,'https://predpredaj.zoznam.sk/sk/listky/dac-1904-fc-twente-enschede-uecl-2026-08-13/',now(),'spectator',ARRAY[]::text[],false),
('official','open','OTHER','OTHER'::"SportType",'Keď chutí pomáhať','Keď chutí pomáhať. Registrácia / účasť — 12.09.2026 09:00. Miesto: RIVER PARK, Dvořákovo nábrežie 4 - 10, 811 02 Bratislava. Zdroj: predpredaj.zoznam.sk

Lokalita: Nové Mesto (Bratislava III).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Predpredaj.sk). https://predpredaj.zoznam.sk/sk/registracie/ked-chuti-pomahat/','https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80','Bratislava','2026-09-12T09:00:00.000Z'::timestamptz,'2026-09-12T09:00:00.000Z'::timestamptz,'2026-09-12T09:00:00.000Z'::timestamptz,0,0,NULL,NULL,0,48.1636,17.1386,(SELECT id FROM venues WHERE name ILIKE 'Tehelné pole' ORDER BY created_at NULLS LAST LIMIT 1),'predpredaj','sk-registracie-ked-chuti-pomahat','https://predpredaj.zoznam.sk/sk/registracie/ked-chuti-pomahat/','Predpredaj.sk',true,'https://predpredaj.zoznam.sk/sk/registracie/ked-chuti-pomahat/',now(),'participate',ARRAY[]::text[],false),
('official','open','FOOTBALL','FOOTBALL'::"SportType",'FC Košice - Permanentka 26/27','FC Košice - Permanentka 26/27. Vstupenky pre divákov — Sezóna 2026/27. Miesto: Košická Futbalová Aréna, Pri prachárni 13, 040 11 Košice. Zdroj: predpredaj.zoznam.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Predpredaj.sk). https://predpredaj.zoznam.sk/sk/listky/fc-kosice-permanentka-2627/','https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80','Košice','2026-08-18T18:00:00.000Z'::timestamptz,'2026-08-18T18:00:00.000Z'::timestamptz,'2026-08-18T18:00:00.000Z'::timestamptz,0,0,NULL,NULL,0,48.7164,21.2381,(SELECT id FROM venues WHERE name ILIKE 'NTC Košice' ORDER BY created_at NULLS LAST LIMIT 1),'predpredaj','sk-listky-fc-kosice-permanentka-2627','https://predpredaj.zoznam.sk/sk/listky/fc-kosice-permanentka-2627/','Predpredaj.sk',true,'https://predpredaj.zoznam.sk/sk/listky/fc-kosice-permanentka-2627/',now(),'spectator',ARRAY[]::text[],false)
ON CONFLICT (source, external_id) WHERE source IS NOT NULL AND external_id IS NOT NULL
DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  starts_at = EXCLUDED.starts_at,
  event_date = EXCLUDED.event_date,
  start_time = EXCLUDED.start_time,
  price = EXCLUDED.price,
  price_cents = EXCLUDED.price_cents,
  capacity = EXCLUDED.capacity,
  max_participants = EXCLUDED.max_participants,
  registered_count = EXCLUDED.registered_count,
  source_url = EXCLUDED.source_url,
  ticket_url = EXCLUDED.ticket_url,
  source_name = EXCLUDED.source_name,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  scraped_at = now(),
  venue_id = COALESCE(EXCLUDED.venue_id, events.venue_id),
  participation_mode = EXCLUDED.participation_mode;