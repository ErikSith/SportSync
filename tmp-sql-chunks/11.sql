INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Do Formy', 'Skupinové cvičenie Form Factory FitCamp — Do Formy. Rezervuj si miesto a zúčastni sa.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-09T18:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'form-factory', 'class-2026-08-09T18:00:00.000Z-do-formy', 'https://fitcamp.formfactory.sk/calendar', 'Form Factory', true,
  'https://fitcamp.formfactory.sk/calendar', now(), 'participate', ARRAY[]::text[], false
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
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Balans joga', 'Balans joga. Ranné skupinové cvičenie balans jógy každý utorok o 7:30 na schodoch pri Dunaji. 4.8.2026 - 25.8.2026 / Eurovea. Otvorená športová aktivita — môžeš sa zúčastniť. Zdroj: citylife.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (CityLife). https://www.citylife.sk/ina-akcia/balans-joga-eurovea-bratislava',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-04T07:30:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Eurovea (Dunaj)' ORDER BY created_at NULLS LAST LIMIT 1),
  'citylife', 'ina-akcia-balans-joga-eurovea-bratislava', 'https://www.citylife.sk/ina-akcia/balans-joga-eurovea-bratislava', 'CityLife', true,
  'https://www.citylife.sk/ina-akcia/balans-joga-eurovea-bratislava', now(), 'participate', ARRAY[]::text[], false
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
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Barre na Dunaji', 'Barre na Dunaji.  5.8.2026 - 26.8.2026 / Eurovea. Otvorená športová aktivita — môžeš sa zúčastniť. Zdroj: citylife.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (CityLife). https://www.citylife.sk/ina-akcia/barre-na-dunaji',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-05T07:30:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Eurovea (Dunaj)' ORDER BY created_at NULLS LAST LIMIT 1),
  'citylife', 'ina-akcia-barre-na-dunaji', 'https://www.citylife.sk/ina-akcia/barre-na-dunaji', 'CityLife', true,
  'https://www.citylife.sk/ina-akcia/barre-na-dunaji', now(), 'participate', ARRAY[]::text[], false
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
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Ranné cvičenie s InstaGym', 'Ranné cvičenie s InstaGym. Ranné skupinové cvičenie pod vedením trénerov Instagym každý štvrtok o 7:30 na schodoch pri Dunaji. 6.8.2026 - 27.8.2026 / Eurovea. Otvorená športová aktivita — môžeš sa zúčastniť. Zdroj: citylife.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (CityLife). https://www.citylife.sk/ina-akcia/ranne-letne-cvicenia-s-instagym-pri-dunaji',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-06T07:30:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Eurovea (Dunaj)' ORDER BY created_at NULLS LAST LIMIT 1),
  'citylife', 'ina-akcia-ranne-letne-cvicenia-s-instagym-pri-dunaji', 'https://www.citylife.sk/ina-akcia/ranne-letne-cvicenia-s-instagym-pri-dunaji', 'CityLife', true,
  'https://www.citylife.sk/ina-akcia/ranne-letne-cvicenia-s-instagym-pri-dunaji', now(), 'participate', ARRAY[]::text[], false
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
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Letné cvičenia', 'Letné cvičenia.  2.7.2026 - 31.8.2026 / Grassalkovichova záhrada. Otvorená športová aktivita — môžeš sa zúčastniť. Zdroj: citylife.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (CityLife). https://www.citylife.sk/ina-akcia/letne-cvicenia',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-04T07:30:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Grassalkovichova zahrada' ORDER BY created_at NULLS LAST LIMIT 1),
  'citylife', 'ina-akcia-letne-cvicenia', 'https://www.citylife.sk/ina-akcia/letne-cvicenia', 'CityLife', true,
  'https://www.citylife.sk/ina-akcia/letne-cvicenia', now(), 'participate', ARRAY[]::text[], false
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
  'official', 'open', 'OTHER', 'OTHER'::"SportType", 'Letná Škola korčuľovania s Decathlon', 'Letná Škola korčuľovania s Decathlon.  5.8.2026 - 26.8.2026 / Eurovea. Otvorená športová aktivita — môžeš sa zúčastniť. Zdroj: citylife.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (CityLife). https://kidstown.citylife.sk/ina-akcia/skola-korculovania-s-decathlonom',
  'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80', 'Bratislava', '2026-08-05T07:30:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Eurovea (Dunaj)' ORDER BY created_at NULLS LAST LIMIT 1),
  'citylife', 'kidstown-citylife-sk-ina-akcia-skola-korculovania-s-decathlonom', 'https://kidstown.citylife.sk/ina-akcia/skola-korculovania-s-decathlonom', 'CityLife', true,
  'https://kidstown.citylife.sk/ina-akcia/skola-korculovania-s-decathlonom', now(), 'participate', ARRAY[]::text[], false
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
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Ranné cvičenie s Gymstick', 'Ranné cvičenie s Gymstick.  7.8.2026 - 28.8.2026 / Eurovea. Otvorená športová aktivita — môžeš sa zúčastniť. Zdroj: citylife.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (CityLife). https://www.citylife.sk/ina-akcia/ranne-cvicenie-s-gymstick',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-07T07:30:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Eurovea (Dunaj)' ORDER BY created_at NULLS LAST LIMIT 1),
  'citylife', 'ina-akcia-ranne-cvicenie-s-gymstick', 'https://www.citylife.sk/ina-akcia/ranne-cvicenie-s-gymstick', 'CityLife', true,
  'https://www.citylife.sk/ina-akcia/ranne-cvicenie-s-gymstick', now(), 'participate', ARRAY[]::text[], false
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
  'official', 'open', 'TENNIS', 'TENNIS'::"SportType", 'DC: Vstupenky sú už v predaji!', 'Davis Cup — vstupenky pre divákov. NTC Košice. Zdroj: stz.sk / predpredaj.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (STZ – oficiálny web). https://www.stz.sk/davis-cup/dc-vstupenky-su-uz-v-predaji-99',
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Košice', '2026-09-19T12:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'stz', 'dc-tickets-davis-cup-dc-vstupenky-su-uz-v-predaji-99', 'https://www.stz.sk/davis-cup/dc-vstupenky-su-uz-v-predaji-99', 'STZ – oficiálny web', true,
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